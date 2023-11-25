import { List } from '@raycast/api'
import { getPreferenceUser } from 'providers'
import { useReducer } from 'react'
import { NamespaceAction } from './NamespaceAction'
import { NamespaceDetail } from './NamespaceDetail'
import { useAllRegionNamespacesQuery } from './queries'

export const Namespaces = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)

  const { data: namespaces = [], isLoading } = useAllRegionNamespacesQuery({
    orderBy: 'created_at_desc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const isListLoading = isLoading && !namespaces

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Namespaces …"
    >
      {namespaces.map((namespace) => (
        <List.Item
          key={namespace.id}
          title={namespace.name}
          icon={{
            source: {
              dark: 'icons/messaging@dark.svg',
              light: 'icons/messaging@light.svg',
            },
          }}
          detail={<NamespaceDetail namespace={namespace} />}
          actions={
            <NamespaceAction namespace={namespace} toggleIsDetailOpen={toggleIsDetailOpen} />
          }
        />
      ))}

      <List.EmptyView title="No Namespaces found" />
    </List>
  )
}
