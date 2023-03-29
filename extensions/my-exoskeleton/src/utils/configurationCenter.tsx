import { fetchSheetValues } from '../apis/bookmark'
import { useCachedPromise, usePromise } from '@raycast/utils'
import { Detail, getPreferenceValues, LocalStorage } from '@raycast/api'
import { ConfigCenterPreference } from './index'
import { FC, useMemo } from 'react'
import { isEmpty, isNil, isUndefined } from 'lodash'
import { isString } from './string'
import { json } from 'stream/consumers'

export interface Configurations {
  dictionarySource: string
  dictionaryConnection: string
  bookmarkSource: string
  grafanaPAT: string
  grafanaBaseUrl: string
  ticketLibraryConnection: string
  gocdPAT: string
  gocdBaseUrl: string
}

const getConfigurationBySpreadsheetId = async (spreadsheetId: string) => {
  const {
    data: { valueRanges }
  } = await fetchSheetValues(spreadsheetId, ['source!A2:B'])
  return valueRanges
    .flatMap((v) => v.values)
    .reduce(
      (map, [name, value]) => ({
        ...map,
        [name]: value
      }),
      {} as Configurations
    )
}
const fetchConfigurations = async (configId: string, secondConfigId: string | null) => {
  const configurations = await getConfigurationBySpreadsheetId(configId)
  if (isString(secondConfigId) && secondConfigId !== '') {
    const secondConfig = await getConfigurationBySpreadsheetId(secondConfigId)
    Object.assign(configurations, secondConfig)
  }
  return configurations
}

const configurationKey = 'configuration'
export const syncConfigurations = async (configId: string, secondConfigId: string | null) => {
  const config = await fetchConfigurations(configId, secondConfigId)
  await LocalStorage.setItem(configurationKey, JSON.stringify(config))
  return config
}

export const getConfigurations = async (configId: string, secondConfigId: string | null) => {
  const configContent = await LocalStorage.getItem(configurationKey)
  if (isString(configContent)) {
    return JSON.parse(configContent)
  }
  return syncConfigurations(configId, secondConfigId)
}

export const Loading = `<img src="images/loading.gif" width="350" height="350" />`

export interface ConfigProp {
  configurations: Configurations
}

type Diff<T, U> = T extends U ? never : T

type DiffMap<T, K> = {
  [X in Diff<keyof T, keyof K>]: T[X]
}

export const withConfig =
  <T extends ConfigProp>(Component: FC<T>) =>
  (props: DiffMap<T, ConfigProp>) => {
    const { configurationId, secondConfigurationId } = getPreferenceValues<ConfigCenterPreference>()
    const { data } = usePromise(getConfigurations, [configurationId, secondConfigurationId])
    if (isEmpty(data)) {
      return <Detail isLoading markdown={Loading} />
    }
    const componentProps = { ...(props || {}), configurations: data } as T
    return <Component {...componentProps} />
  }
