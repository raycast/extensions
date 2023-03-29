import { FC } from 'react'
import { Detail, getPreferenceValues } from '@raycast/api'
import { ConfigCenterPreference } from '../../utils'
import { usePromise } from '@raycast/utils'
import { isEmpty } from 'lodash'
import { Loading, syncConfigurations } from '../../utils/configurationCenter'

export const SyncConfiguration: FC = () => {
  const { configurationId, secondConfigurationId } = getPreferenceValues<ConfigCenterPreference>()
  const { data } = usePromise(syncConfigurations, [configurationId, secondConfigurationId])
  if (isEmpty(data)) {
    return <Detail isLoading markdown={Loading} />
  }
  return (
    <Detail
      markdown={`
# Load configuration success
`}
    />
  )
}
