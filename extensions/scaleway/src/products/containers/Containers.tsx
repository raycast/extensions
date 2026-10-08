import { List } from '@raycast/api'
import { getPreferenceUser } from 'helpers/getPreferenceUser'
import { useReducer, useState } from 'react'
import { POLLING_INTERVAL } from '../../constants'
import { ContainerActions } from './ContainerActions'
import { ContainerDetail } from './ContainerDetail'
import { ContainerDropdown } from './ContainerDropdown'
import { useAllContainersQuery, useAllRegionsNamespacesQuery } from './queries'
import { getContainerStatusIcon, isContainerTransient } from './status'

export const Containers = () => {
  const clientSetting = getPreferenceUser()
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, true)
  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string>('')

  const { data: namespaces } = useAllRegionsNamespacesQuery({
    orderBy: 'created_at_asc',
    organizationId: clientSetting.defaultOrganizationId,
  })

  const {
    data: containers,
    isLoading,
    reload: reloadContainers,
  } = useAllContainersQuery(
    {
      namespaceId: selectedNamespaceId,
      region: (namespaces || []).find(({ id }) => id === selectedNamespaceId)?.region,
    },
    {
      enabled: selectedNamespaceId !== '',
      pollingInterval: POLLING_INTERVAL['10S'],
      needPolling: (data) => (data || []).some(isContainerTransient),
    }
  )

  const isListLoading = isLoading && !namespaces && !containers

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Containers …"
      searchBarAccessory={
        <ContainerDropdown
          setSelectedNamespaceId={setSelectedNamespaceId}
          namespaces={namespaces}
        />
      }
    >
      {(containers || []).map((container) => (
        <List.Item
          key={container.id}
          title={container.name}
          icon={{
            source: {
              dark: 'icons/serverless-containers@dark.svg',
              light: 'icons/serverless-containers@light.svg',
            },
          }}
          detail={<ContainerDetail container={container} namespaces={namespaces} />}
          accessories={[
            {
              tooltip: container.status,
              icon: getContainerStatusIcon(container),
            },
          ]}
          actions={
            <ContainerActions
              container={container}
              toggleIsDetailOpen={toggleIsDetailOpen}
              reloadContainers={reloadContainers}
            />
          }
        />
      ))}

      <List.EmptyView title="No Containers found" />
    </List>
  )
}
