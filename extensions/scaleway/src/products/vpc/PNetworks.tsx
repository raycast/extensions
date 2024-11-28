import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer } from 'react'
import { PNAction } from './PNAction'
import { PNDetail } from './PNDetail'
import { useAllRegionsPrivateNetworksQuery } from './queries'

export const PNetworks = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: privateNetworks = [], isLoading } = useAllRegionsPrivateNetworksQuery({
    orderBy: 'created_at_asc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !privateNetworks

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Private Networks …"
    >
      {privateNetworks.map((privateNetwork) => (
        <List.Item
          key={privateNetwork.id}
          title={privateNetwork.name}
          icon={{
            source: {
              dark: 'icons/private-networks@dark.svg',
              light: 'icons/private-networks@light.svg',
            },
          }}
          detail={<PNDetail privateNetwork={privateNetwork} />}
          actions={
            <PNAction privateNetwork={privateNetwork} toggleIsDetailOpen={toggleIsDetailOpen} />
          }
        />
      ))}

      <List.EmptyView title="No Private Networks found" />
    </List>
  )
}
