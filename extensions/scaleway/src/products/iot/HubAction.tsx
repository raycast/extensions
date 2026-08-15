import { Action, ActionPanel } from '@raycast/api'
import type { Iotv1 } from '@scaleway/sdk'
import { getHubUrl } from './urls'

type HubActionProps = {
  hub: Iotv1.Hub
  toggleIsDetailOpen: () => void
}

export const HubAction = ({ hub, toggleIsDetailOpen }: HubActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getHubUrl(hub)} />
    <Action.CopyToClipboard content={getHubUrl(hub)} />
  </ActionPanel>
)
