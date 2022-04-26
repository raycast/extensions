import { useState, useEffect, useRef } from 'react'
import { ErrorHandler } from '../utils/error'
import { ApiLoaderCustomType, ApiLoaderType } from '../utils/types'
import useLatestState from './useLatestState'
import useUnmounted from './useUnmounted'

export type ConfigType<T, P> = {
  apiLoader: ApiLoaderType | ApiLoaderCustomType<T>
  defaultData: T
  manual?: boolean
  debounce?: boolean
  disabled?: boolean
  refetchInterval?: number
  disabledByFunc?: (params: P) => boolean
  cleanEffect?: boolean
  loadingInitialState?: boolean
  callback?: () => void
}

type UseRequireReturnType<T, P> = {
  response: T
  loading: boolean
  error: boolean
  setResponse: React.Dispatch<React.SetStateAction<T>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<boolean>>
  run: (reqParams?: P) => Promise<T | undefined>
}

const useRequire = <T, P = undefined>({
  apiLoader,
  defaultData,
  callback,
  disabledByFunc,
  manual = false,
  debounce = false,
  disabled = false,
  cleanEffect = false,
  refetchInterval = 0,
  loadingInitialState = true,
}: ConfigType<T, P>): UseRequireReturnType<T, P> => {
  const [loading, setLoading] = useState(loadingInitialState)
  const [response, setResponse] = useState(defaultData)
  const [error, setError] = useState(false)

  const currentUnmountStatus = useUnmounted()
  const currentReqParams = useLatestState<P | undefined>(undefined, true)
  const currentApiLoader = useLatestState<ApiLoaderType | ApiLoaderCustomType<T>>(apiLoader)
  const currentDisabled = useLatestState<boolean>(disabled)
  const currentDisabledByFunc = useLatestState(disabledByFunc)
  const refetchTimer = useRef<NodeJS.Timer>()

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout
    if (disabled) return

    if (manual) return

    if (refetchInterval) {
      getData()
      refetchTimer.current = setInterval(() => {
        getData()
      }, refetchInterval)
    } else if (debounce) {
      debounceTimer = setTimeout(() => {
        getData()
      }, 500)
    } else {
      getData()
    }

    return () => {
      cleanEffect && setResponse(defaultData)
      debounce && clearTimeout(debounceTimer)
      refetchTimer.current && clearTimeout(refetchTimer.current)
    }
  }, [apiLoader])

  const run = async (reqParams?: P) => {
    return await getData(reqParams)
  }

  const getData = async (reqParams?: P) => {
    if (currentUnmountStatus.current) return
    currentReqParams.current = reqParams
    setLoading(true)
    setError(false)

    try {
      const result = await apiLoader<T, P>(reqParams)
      const resultData = result.data

      if (currentUnmountStatus.current) return
      if (currentReqParams.current !== reqParams) return
      if (currentApiLoader.current !== apiLoader) return
      if (currentDisabled.current) return
      if (currentDisabledByFunc.current && reqParams && currentDisabledByFunc.current(reqParams)) return

      setResponse(resultData)
      setLoading(false)

      callback && callback()

      return resultData
    } catch (e) {
      refetchTimer.current && clearTimeout(refetchTimer.current)
      if (currentUnmountStatus.current) return
      if (currentReqParams.current !== reqParams) return
      if (currentApiLoader.current !== apiLoader) return
      if (currentDisabled.current) return
      if (currentDisabledByFunc.current && reqParams && currentDisabledByFunc.current(reqParams)) return

      if (process.env.NODE_ENV === 'development') console.error(e)
      ErrorHandler(e)
      setLoading(false)
      setError(true)
    }
  }

  return { response, loading, error, setResponse, setLoading, setError, run }
}

export default useRequire
