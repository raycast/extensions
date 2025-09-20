import { Action, ActionPanel } from '@raycast/api'
import type { IOT } from '@scaleway/sdk'
import { getHubUrl } from './urls'

type HubActionProps = {
  hub: IOT.v1.Hub
  toggleIsDetailOpen: () => void
}

export const HubAction = ({ hub, toggleIsDetailOpen }: HubActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getHubUrl(hub)} />
    <Action.CopyToClipboard content={getHubUrl(hub)} />
  </ActionPanel>
)
