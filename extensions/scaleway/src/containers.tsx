import { ActionPanel, Icon, List } from '@raycast/api'
import { useState } from 'react'
import ContainerDetail from './components/ContainerDetail'
import ContainerLogs from './components/ContainerLogs'
import { Container } from '@scaleway/sdk'
import { useCachedPromise } from '@raycast/utils'
import { CONSOLE_URL, getScalewayClient } from './api/client'
import { deployContainer } from './api/containers'
import { getContainerStatusIcon, getPrivacyAccessory } from './helpers/containers'
import { getCountryImage } from './helpers'

export default function ContainersView() {
  const api = new Container.v1beta1.API(getScalewayClient())

  const { data: namespaces, isLoading: loadingNamespaces } = useCachedPromise(
    async () => {
      const response = await Promise.all(
        Container.v1beta1.API.LOCALITIES.map((region) => api.listNamespaces({ region }))
      )
      return response.map((r) => r.namespaces).flat()
    },
    [],
    { initialData: [] }
  )

  const [selectedNamespaceId, setSelectedNamespaceId] = useState<string | null>(null)

  const {
    data: containers,
    isLoading: loadingContainers,
    revalidate: fetchContainers,
  } = useCachedPromise(
    async (namespaceId) => {
      return (
        await api.listContainers({
          namespaceId,
          region: namespaces.find((n) => n.id === namespaceId)!.region,
        })
      ).containers
    },
    [selectedNamespaceId],
    { execute: !!selectedNamespaceId, initialData: [] }
  )

  return (
    <List
      isLoading={loadingContainers || loadingNamespaces}
      isShowingDetail
      searchBarPlaceholder="Search containers..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Namespace"
          placeholder="Search namespace..."
          storeValue
          onChange={setSelectedNamespaceId}
        >
          {namespaces.map((namespace) => (
            <List.Dropdown.Item
              key={namespace.id}
              title={namespace.name}
              value={namespace.id}
              icon={getCountryImage(namespace.region)}
            />
          ))}
        </List.Dropdown>
      }
    >
      {containers.map((container) => (
        <List.Item
          key={container.id}
          title={container.name}
          icon={getContainerStatusIcon(container.status)}
          accessories={[getPrivacyAccessory(container.privacy)]}
          detail={ContainerDetail(container)}
          actions={
            <ActionPanel>
              <ActionPanel.Item.OpenInBrowser url={getContainerUrl(container)} />
              <ActionPanel.Item.CopyToClipboard
                title="Copy URL"
                content={getContainerUrl(container)}
              />
              <ActionPanel.Item.Push
                title="See Logs"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ['cmd'], key: 'l' }}
                target={<ContainerLogs container={container} />}
              />
              <ActionPanel.Item
                title="Deploy Container"
                icon={Icon.Plus}
                shortcut={{ modifiers: ['cmd'], key: 'n' }}
                onAction={async () => await deployContainer(api, container, fetchContainers)}
              />
              <ActionPanel.Item
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={() => fetchContainers()}
              />
            </ActionPanel>
          }
        />
      ))}

      <List.EmptyView title="No containers found" />
    </List>
  )
}

function getContainerUrl(container: Container.v1beta1.Container) {
  return `${CONSOLE_URL}/containers/namespaces/${container.region}/${container.namespaceId}/containers/${container.id}/deployment`
}
