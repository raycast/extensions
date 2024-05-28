import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { POLLING_INTERVAL } from '../../constants'
import { ServerAction } from './ServerAction'
import { ServerDetail } from './ServerDetail'
import { useAllZoneServersQuery } from './queries'
import { getServerStatusIcon, isServerTransient } from './status'

export const Servers = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const {
    data: servers = [],
    isLoading,
    reload: reloadServer,
  } = useAllZoneServersQuery(
    {
      organization: clientSetting.defaultOrganizationId,
    },
    {
      pollingInterval: POLLING_INTERVAL['10S'],
      needPolling: (localServers) => (localServers || []).some(isServerTransient),
    }
  )

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
              tooltip: server.state,
              icon: getServerStatusIcon(server),
            },
          ]}
          actions={
            <ServerAction
              server={server}
              toggleIsDetailOpen={toggleIsDetailOpen}
              reloadServer={reloadServer}
            />
          }
        />
      ))}

      <List.EmptyView title="No Servers found" />
    </List>
  )
}
