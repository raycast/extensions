import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { HubAction } from './HubAction'
import { HubDetail } from './HubDetail'
import { useAllRegionsHubsQuery } from './queries'
import { getHubStatusIcon } from './status'

export const Hubs = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: hubs = [], isLoading } = useAllRegionsHubsQuery({
    orderBy: 'created_at_desc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !hubs

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Hubs …"
    >
      {hubs.map((hub) => (
        <List.Item
          key={hub.id}
          title={hub.name}
          icon={{
            source: {
              dark: 'icons/mac-m1@dark.svg',
              light: 'icons/mac-m1@light.svg',
            },
          }}
          detail={<HubDetail hub={hub} />}
          accessories={[
            {
              tooltip: hub.status,
              icon: getHubStatusIcon(hub),
            },
          ]}
          actions={<HubAction hub={hub} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Hubs found" />
    </List>
  )
}
