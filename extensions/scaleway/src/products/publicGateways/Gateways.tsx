import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { GatewayAction } from './GatewayAction'
import { GatewayDetail } from './GatewayDetail'
import { useAllZonesGatewaysQuery } from './queries'
import { getGatewayStatusIcon } from './status'

export const Gateways = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: gateways = [], isLoading } = useAllZonesGatewaysQuery({
    orderBy: 'created_at_asc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !gateways

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Public Gateways …"
    >
      {gateways.map((gateway) => (
        <List.Item
          key={gateway.id}
          title={gateway.name}
          icon={{
            source: {
              dark: 'icons/public-gateway@dark.svg',
              light: 'icons/public-gateway@light.svg',
            },
          }}
          detail={<GatewayDetail gateway={gateway} />}
          accessories={[
            {
              tooltip: gateway.status,
              icon: getGatewayStatusIcon(gateway),
            },
          ]}
          actions={<GatewayAction gateway={gateway} toggleIsDetailOpen={toggleIsDetailOpen} />}
        />
      ))}

      <List.EmptyView title="No Public Gateways found" />
    </List>
  )
}
