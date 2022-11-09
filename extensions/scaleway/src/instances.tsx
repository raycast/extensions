import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { catchError, ScalewayAPI } from './scaleway/api'
import { useEffect, useState } from 'react'
import { Instance } from './scaleway/types'
import { getCountryImage, getInstanceStateIcon } from './utils'
import InstanceDetails from './instances/instance-details'
import { powerOffInstance, powerOnInstance, rebootInstance } from './instances/instance-actions'
import { InstancesAPI } from './scaleway/instances-api'

interface InstancesState {
  isLoading: boolean
  instances: Instance[]
  error?: unknown
}

export default function Instances() {
  const [state, setState] = useState<InstancesState>({ instances: [], isLoading: true })

  async function fetchInstances() {
    setState((previous) => ({ ...previous, isLoading: true }))

    try {
      const instances = await InstancesAPI.getAllInstances()

      setState((previous) => ({ ...previous, instances, isLoading: false }))
    } catch (error) {
      await catchError(error)
      setState((previous) => ({
        ...previous,
        error: error instanceof Error ? error : new Error('Something went wrong'),
        isLoading: false,
        instances: [],
      }))
    }
  }

  useEffect(() => {
    fetchInstances().then()
  }, [])

  async function executeAction(instance: Instance, action: 'poweron' | 'poweroff' | 'reboot') {
    switch (action) {
      case 'poweron':
        if (await powerOnInstance(instance)) await fetchInstances()
        return
      case 'poweroff':
        if (await powerOffInstance(instance)) await fetchInstances()
        return
      case 'reboot':
        if (await rebootInstance(instance)) await fetchInstances()
        return
    }
  }

  return (
    <List isLoading={state.isLoading} isShowingDetail searchBarPlaceholder="Search instances...">
      {state.instances.map((instance) => (
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
          detail={InstanceDetails(instance)}
          actions={
            <ActionPanel>
              <ActionPanel.Item.OpenInBrowser url={getInstanceUrl(instance)} />
              <ActionPanel.Item.CopyToClipboard
                title="Copy URL"
                content={getInstanceUrl(instance)}
              />
              {instance.allowed_actions.includes('reboot') && (
                <ActionPanel.Item
                  title="Reboot"
                  icon={Icon.RotateClockwise}
                  shortcut={{ modifiers: ['cmd'], key: 'r' }}
                  onAction={async () => await executeAction(instance, 'reboot')}
                />
              )}
              {instance.allowed_actions.includes('poweron') && (
                <ActionPanel.Item
                  title="Power On"
                  icon={Icon.Play}
                  shortcut={{ modifiers: ['cmd'], key: 'u' }}
                  onAction={async () => await executeAction(instance, 'poweron')}
                />
              )}
              {instance.allowed_actions.includes('poweroff') && (
                <ActionPanel.Item
                  title="Shutdown"
                  icon={Icon.Stop}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ['cmd'], key: 'q' }}
                  onAction={async () => await executeAction(instance, 'poweroff')}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

function getInstanceUrl(instance: Instance) {
  return `${ScalewayAPI.CONSOLE_URL}/instance/servers/${instance.zone}/${instance.id}/overview`
}
