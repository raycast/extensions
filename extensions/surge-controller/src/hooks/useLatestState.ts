import { useRef, useEffect, MutableRefObject } from 'react'

const useLatestState = <T>(value: T, once = false): MutableRefObject<T> => {
  const ref = useRef<T>(value)

  useEffect(() => {
    if (once) return
    ref.current = value
  }, [value, once])

  return ref
}

export default useLatestState
