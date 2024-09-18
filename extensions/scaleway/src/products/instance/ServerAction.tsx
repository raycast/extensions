import { Action, ActionPanel, Icon } from '@raycast/api'
import type { Instance } from '@scaleway/sdk'
import { useAPI } from 'helpers/useAPI'
import { powerOffInstance, powerOnInstance, rebootInstance } from './actions'
import { getServerUrl } from './urls'

type ServerActionProps = {
  server: Instance.v1.Server
  toggleIsDetailOpen: () => void
  reloadServer: () => Promise<void> | void
}

export const ServerAction = ({ server, toggleIsDetailOpen, reloadServer }: ServerActionProps) => {
  const { instanceV1 } = useAPI()

  return (
    <ActionPanel>
      <Action title="More Information" onAction={toggleIsDetailOpen} />
      <Action.OpenInBrowser url={getServerUrl(server)} />
      <Action.CopyToClipboard content={getServerUrl(server)} />
      {server.allowedActions.includes('reboot') && (
        <Action
          title="Reboot"
          icon={Icon.RotateClockwise}
          shortcut={{ modifiers: ['cmd'], key: 'r' }}
          onAction={async () =>
            rebootInstance({
              api: instanceV1,
              server,
              onSuccess: reloadServer,
            })
          }
        />
      )}
      {server.allowedActions.includes('poweron') && (
        <Action
          title="Power On"
          icon={Icon.Play}
          shortcut={{ modifiers: ['cmd'], key: 'u' }}
          onAction={async () =>
            powerOnInstance({
              api: instanceV1,
              server,
              onSuccess: reloadServer,
            })
          }
        />
      )}
      {server.allowedActions.includes('poweroff') && (
        <Action
          title="Shutdown"
          icon={Icon.Stop}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ['cmd'], key: 'q' }}
          onAction={async () =>
            powerOffInstance({
              api: instanceV1,
              server,
              onSuccess: reloadServer,
            })
          }
        />
      )}
      <Action
        title="Refresh"
        icon={Icon.RotateClockwise}
        shortcut={{ modifiers: ['cmd'], key: 'r' }}
        onAction={() => reloadServer()}
      />
    </ActionPanel>
  )
}
