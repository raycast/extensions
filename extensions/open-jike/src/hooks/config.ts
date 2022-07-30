import { useEffect } from 'react'
import { createGlobalState } from 'react-use'
import { defaultConfig, readConfig, writeConfig } from '../utils/config'
import type { Config } from '../utils/config'

const useConfigValue = createGlobalState<Config>(defaultConfig)
const useConfigReadyValue = createGlobalState(false)

export const useConfig = () => {
  const [config, setState] = useConfigValue()
  const [ready, setReady] = useConfigReadyValue()

  const setConfig = async (config: Config) => {
    await writeConfig(config)
    await reload()
  }

  const reload = async () => {
    setState(await readConfig())
    setReady(true)
  }

  useEffect(() => {
    if (!ready) reload()
  }, [ready])

  return {
    config,
    ready,
    setConfig,
    reload,
  }
}
