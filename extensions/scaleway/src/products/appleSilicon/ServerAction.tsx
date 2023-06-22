import { Action, ActionPanel } from '@raycast/api'
import type { AppleSilicon } from '@scaleway/sdk'
import { getServerUrl } from './urls'

type ServerActionProps = {
  server: AppleSilicon.v1alpha1.Server
  toggleIsDetailOpen: () => void
}

export const ServerAction = ({ server, toggleIsDetailOpen }: ServerActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getServerUrl(server)} />
    <Action.CopyToClipboard content={getServerUrl(server)} />
  </ActionPanel>
)
