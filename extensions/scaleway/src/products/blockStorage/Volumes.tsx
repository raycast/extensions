import { List } from '@raycast/api'
import { useReducer } from 'react'
import { POLLING_INTERVAL } from '../../constants'
import { VolumeAction } from './VolumeAction'
import { VolumeDetail } from './VolumeDetail'
import { useAllZoneVolumesQuery } from './queries'
import { getVolumeStatusIcon, isVolumeTransient } from './status'

export const Volumes = () => {
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: volumes = [], isLoading } = useAllZoneVolumesQuery(
    {
      orderBy: 'created_at_desc',
    },
    {
      pollingInterval: POLLING_INTERVAL['10S'],
      needPolling: (data) => (data || []).some(isVolumeTransient),
    }
  )

  const isListLoading = isLoading && !volumes

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Servers …"
    >
      {volumes.map((volume) => (
        <List.Item
          key={volume.id}
          title={volume.name}
          icon={{
            source: {
              dark: 'icons/block-storage@dark.svg',
              light: 'icons/block-storage@light.svg',
            },
          }}
          detail={<VolumeDetail volume={volume} />}
          accessories={[
            {
              tooltip: volume.status,
              icon: getVolumeStatusIcon(volume),
            },
          ]}
          actions={<VolumeAction toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Servers found" />
    </List>
  )
}
