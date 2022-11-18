import { ActionPanel, confirmAlert, Icon, List, showToast, Toast } from '@raycast/api'
import { getContainerStatusIcon, getCountryImage, getPrivacyAccessory } from './utils'
import { catchError, ScalewayAPI } from './scaleway/api'
import { useEffect, useMemo, useState } from 'react'
import { Container, ContainerDomain, Namespace } from './scaleway/types'
import ContainerDetails from './containers/container-details'
import { ContainersAPI } from './scaleway/containers-api'
import Style = Toast.Style
import ContainerLogs from './containers/container-logs'

interface ContainersState {
  isLoading: boolean
  namespaces: (Namespace & { containers: (Container & { domains: ContainerDomain[] })[] })[]
  selectedNamespaceId?: string | undefined
  error?: unknown
}

export default function Containers() {
  const [state, setState] = useState<ContainersState>({ namespaces: [], isLoading: true })

  async function deployContainer(container: Container) {
    try {
      if (await confirmAlert({ title: 'Are you sure you want to deploy a new container?' })) {
        await showToast({
          title: 'Deploying container...',
          message: container.name,
          style: Style.Animated,
        })

        await ContainersAPI.deployContainer(container)

        await showToast({
          title: 'Container successfully deployed',
          message: container.name,
          style: Style.Success,
        })

        await fetchContainers()
      }
    } catch (error) {
      await catchError(error, 'Error while deploying a container')
    }
  }

  async function fetchContainers() {
    setState((previous) => ({ ...previous, isLoading: true }))

    const allNamespaces: ContainersState['namespaces'] = []

    try {
      const [namespaces, containers, domains] = await Promise.all([
        ContainersAPI.getAllNamespaces(),
        ContainersAPI.getAllContainers(),
        ContainersAPI.getAllDomains(),
      ])

      // Regroup containers by namespace and add domains to each container
      allNamespaces.push(
        ...namespaces.map((namespace) => ({
          ...namespace,
          containers: containers
            .filter((c) => c.namespace_id === namespace.id)
            .map((container) => ({
              ...container,
              domains: domains.filter((d) => d.container_id === container.id),
            })),
        }))
      )

      setState((previous) => ({
        ...previous,
        namespaces: allNamespaces,
        selectedNamespaceId: allNamespaces[0]?.id,
        isLoading: false,
      }))
    } catch (error) {
      await catchError(error)
      setState((previous) => ({
        ...previous,
        error: error instanceof Error ? error : new Error('Something went wrong'),
        isLoading: false,
        selectedNamespaceId: undefined,
        namespaces: [],
      }))
    }
  }

  useEffect(() => {
    fetchContainers().then()
  }, [])

  const selectedNamespace = useMemo(() => {
    return state.namespaces.find((n) => n.id === state.selectedNamespaceId)
  }, [state.namespaces, state.selectedNamespaceId])

  return (
    <List
      isLoading={state.isLoading}
      isShowingDetail
      searchBarPlaceholder="Search containers..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Namespace"
          placeholder="Search namespace..."
          storeValue={true}
          onChange={(newValue) => {
            setState((previous) => ({ ...previous, selectedNamespaceId: newValue }))
          }}
        >
          {state.namespaces.map((namespace) => (
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
      {selectedNamespace &&
        selectedNamespace.containers.map((container) => (
          <List.Item
            key={container.id}
            title={container.name}
            icon={getContainerStatusIcon(container.status)}
            accessories={[getPrivacyAccessory(container.privacy)]}
            detail={ContainerDetails(container)}
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
                  onAction={async () => await deployContainer(container)}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  )
}

function getContainerUrl(container: Container) {
  return `${ScalewayAPI.CONSOLE_URL}/containers/namespaces/${container.region}/${container.namespace_id}/containers/${container.id}/deployment`
}
