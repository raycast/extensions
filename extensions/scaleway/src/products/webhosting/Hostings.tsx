import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { POLLING_INTERVAL } from '../../constants'
import { HostingAction } from './HostingAction'
import { HostingDetail } from './HostingDetail'
import { useAllRegionHostingsQuery } from './queries'
import { getHostingStatusIcon, isHostingTransient } from './status'

export const Hostings = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: hostings = [], isLoading } = useAllRegionHostingsQuery(
    {
      orderBy: 'created_at_desc',
      organizationId: clientSetting.defaultOrganizationId,
    },
    {
      pollingInterval: POLLING_INTERVAL['10S'],
      needPolling: (data) => (data || []).some(isHostingTransient),
    }
  )

  const isListLoading = isLoading && !hostings

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Cluster …"
    >
      {hostings.map((hosting) => (
        <List.Item
          key={hosting.id}
          title={hosting.domain}
          icon={{
            source: {
              dark: 'icons/webhosting-hosting@dark.svg',
              light: 'icons/webhosting-hosting@light.svg',
            },
          }}
          detail={<HostingDetail hosting={hosting} />}
          accessories={[
            {
              tooltip: hosting.status,
              icon: getHostingStatusIcon(hosting),
            },
          ]}
          actions={<HostingAction hosting={hosting} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Clusters found" />
    </List>
  )
}
