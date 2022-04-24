import { useEffect, useRef } from 'react'

const useUnmounted = () => {
  const unmountedRef = useRef(false)

  useEffect(() => {
    return () => {
      unmountedRef.current = true
    }
  }, [])

  return unmountedRef
}

export default useUnmounted
