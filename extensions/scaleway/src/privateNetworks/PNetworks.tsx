import { List } from '@raycast/api'
import { useReducer } from 'react'
import { PNAction } from './PNAction'
import { PNDetail } from './PNDetail'
import { useAllZonesPrivateNetworksQuery } from './queries'

export const PNetworks = () => {
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: privateNetworks = [], isLoading } = useAllZonesPrivateNetworksQuery({
    orderBy: 'created_at_asc',
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
