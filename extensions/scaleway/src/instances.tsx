import { Action, ActionPanel, Icon, List } from '@raycast/api'
import InstanceDetail from './components/InstanceDetail'
import { Instance } from '@scaleway/sdk'
import { CONSOLE_URL, getScalewayClient } from './api/client'
import { useCachedPromise } from '@raycast/utils'
import { powerOffInstance, powerOnInstance, rebootInstance } from './api/instances'
import { getInstanceStateIcon } from './helpers/instances'
import { getCountryImage } from './helpers'

export default function InstancesView() {
  const api = new Instance.v1.API(getScalewayClient())

  const {
    data: instances,
    isLoading,
    revalidate: fetchInstances,
  } = useCachedPromise(
    async () => {
      const response = await Promise.all(
        Instance.v1.API.LOCALITIES.map((zone) => api.listServers({ zone }))
      )
      return response.map((r) => r.servers).flat()
    },
    [],
    { initialData: [] }
  )

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search instances...">
      {instances.map((instance) => (
        <List.Item
          key={instance.id}
          title={instance.name}
          icon={getInstanceStateIcon(instance.state)}
          accessories={[
            {
              icon: getCountryImage(instance.zone),
              tooltip: instance.zone,
            },
          ]}
          detail={InstanceDetail(instance)}
          actions={
            <ActionPanel>
              <ActionPanel.Item.OpenInBrowser url={getInstanceUrl(instance)} />
              <ActionPanel.Item.CopyToClipboard
                title="Copy URL"
                content={getInstanceUrl(instance)}
              />
              {instance.allowedActions.includes('reboot') && (
                <ActionPanel.Item
                  title="Reboot"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  onAction={async () => await rebootInstance(api, instance, fetchInstances)}
                />
              )}
              {instance.allowedActions.includes('poweron') && (
                <ActionPanel.Item
                  title="Power On"
                  icon={Icon.Play}
                  shortcut={{ modifiers: ['cmd'], key: 'u' }}
                  onAction={async () => await powerOnInstance(api, instance, fetchInstances)}
                />
              )}
              {instance.allowedActions.includes('poweroff') && (
                <ActionPanel.Item
                  title="Shutdown"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ['cmd'], key: 'q' }}
                  onAction={async () => await powerOffInstance(api, instance, fetchInstances)}
                />
              )}
              <ActionPanel.Item
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={() => fetchInstances()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

function getInstanceUrl(instance: Instance.v1.Server) {
  return `${CONSOLE_URL}/instance/servers/${instance.zone}/${instance.id}/overview`
}
