import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { ServerAction } from './ServerAction'
import { ServerDetail } from './ServerDetail'
import { useAllZoneServersQuery } from './queries'
import { getServerStatusIcon } from './status'

export const Servers = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: servers = [], isLoading } = useAllZoneServersQuery({
    orderBy: 'created_at_desc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !servers

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Servers …"
    >
      {servers.map((server) => (
        <List.Item
          key={server.id}
          title={server.name}
          icon={{
            source: {
              dark: 'icons/mac-m1@dark.svg',
              light: 'icons/mac-m1@light.svg',
            },
          }}
          detail={<ServerDetail server={server} />}
          accessories={[
            {
              tooltip: server.status,
              icon: getServerStatusIcon(server),
            },
          ]}
          actions={<ServerAction server={server} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Servers found" />
    </List>
  )
}
