/** @format */

// https://juejin.im/post/5d594ea5518825041301bbcb

import { useState, useCallback, useRef, Dispatch, SetStateAction, MutableRefObject } from 'react'

// 模拟传统的setState
export function useSetState<S extends Record<string, any>>(
  initalState: S | (() => S)
): [S, (state: Partial<S> | ((state: S) => Partial<S>)) => void] {
  const [_state, _setState] = useState<S>(initalState)
  // setState也可以接受一个函数，这个函数用上一个 state 作为第一个参数，而prev就是useState更新方法中传入函数时的上一个状态
  const setState = useCallback((state: Partial<S> | ((state: S) => Partial<S>)) => {
    _setState((prev: S) => {
      let nextState = state
      if (typeof state === 'function') {
        nextState = state(prev)
      }

      return { ...prev, ...nextState }
    })
  }, [])

  return [_state, setState]
}

// 强制重新渲染
export function useForceUpdate() {
  const [, setValue] = useState(0)
  return useCallback(() => {
    // 递增state值，强制React进行重新渲染
    setValue(val => (val + 1) % (Number.MAX_SAFE_INTEGER - 1))
  }, [])
}

//  简化localStorage存取
export function useStorage<T>(
  key: string,
  // 默认值
  defaultValue?: T | (() => T),
  // 是否在窗口关闭后保持数据
  keepOnWindowClosed = true
): [T | undefined, Dispatch<SetStateAction<T>>, () => void] {
  const storage = keepOnWindowClosed ? localStorage : sessionStorage

  // 尝试从Storage恢复值
  const getStorageValue = () => {
    try {
      const storageValue = storage.getItem(key)
      if (storageValue != null) {
        return JSON.parse(storageValue)
      } else if (defaultValue) {
        // 设置默认值
        const value = typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue
        storage.setItem(key, JSON.stringify(value))
        return value
      }
    } catch (err) {
      console.warn(`useStorage 无法获取${key}: `, err)
    }

    return undefined
  }
  // 以一个函数来初始化useState
  const [value, setValue] = useState<T | undefined>(getStorageValue)

  // 更新组件状态并保存到Storage
  // type Dispatch<A> = (value: A) => void;
  // type SetStateAction<S> = S | ((prevState: S) => S);
  // function useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T;

  const save = useCallback<Dispatch<SetStateAction<T>>>(
    value => {
      setValue(prev => {
        const finalValue = typeof value === 'function' ? (value as (prev: T | undefined) => T)(prev) : value
        storage.setItem(key, JSON.stringify(finalValue))
        return finalValue
      })
    },
    [key, storage]
  )

  // 移除状态
  const clear = useCallback(() => {
    storage.removeItem(key)
    setValue(undefined)
  }, [key, storage])

  return [value, save, clear]
}

// 引用state的最新值

export function useRefState<S>(
  initialState: S | (() => S)
): [S, (state: S | ((state: S) => S)) => void, MutableRefObject<S>] {
  // interface MutableRefObject<T> {
  //   current: T
  // }
  const ins = useRef<S>()
  // function useRef<T = undefined>(): MutableRefObject<T | undefined>;

  const [state, setState] = useState(() => {
    // 初始化
    const value = initialState instanceof Function ? initialState() : initialState
    ins.current = value
    return value
  })

  const setValue = useCallback<Dispatch<SetStateAction<S>>>(value => {
    if (value instanceof Function) {
      setState((prevState: S) => {
        const finalValue = value(prevState)
        ins.current = finalValue
        return finalValue
      })
    } else {
      ins.current = value
      setState(value)
    }
  }, [])

  return [state, setValue, ins as MutableRefObject<S>]
}

// 引用最新的Props

export default function useRefProps<T>(props: T) {
  const ref = useRef<T>(props)
  // 每次重新渲染设置值
  ref.current = props

  return ref
}

// useInstance
function isFunction<T>(initial?: T | (() => T)): initial is () => T {
  return typeof initial === 'function'
}

export function useInstance<T extends {}>(initial?: T | (() => T)) {
  const instance = useRef<T>()
  // 初始化

  console.log(initial)
  if (instance.current === null) {
    if (initial) {
      instance.current = isFunction(initial) ? initial() : initial
    } else {
      instance.current = {} as T
    }
  }
  return instance.current
}
