import { fetchSheetValues } from '../apis/bookmark'
import { useCachedPromise, usePromise } from '@raycast/utils'
import { Detail, getPreferenceValues, List } from '@raycast/api'
import { ConfigCenterPreference } from './index'
import { FC } from 'react'
import { isNil } from 'lodash'

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

export const getConfigurations = async () => {
  const { configurationId } = getPreferenceValues<ConfigCenterPreference>()
  const {
    data: { valueRanges }
  } = await fetchSheetValues(configurationId, ['source!A2:B'])
  const configurations = valueRanges
    .flatMap((v) => v.values)
    .reduce(
      (map, [name, value]) => ({
        ...map,
        [name]: value
      }),
      {} as Configurations
    )
  console.log('configs', JSON.stringify(configurations))
  return configurations
}

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
    const { isLoading, data } = useCachedPromise(getConfigurations, [], { keepPreviousData: true })
    if (!isNil(data)) {
      const componentProps = { ...(props || {}), configurations: data } as T
      return <Component {...componentProps} />
    }
    return (
      <Detail
        isLoading={isLoading}
        markdown={`
  <img src="images/loading.gif" />
  `}
      />
    )
  }
