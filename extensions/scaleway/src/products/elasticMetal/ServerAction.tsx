import { Action, ActionPanel } from '@raycast/api'
import type { BareMetal } from '@scaleway/sdk'
import { getServerUrl } from './urls'

type ServerActionProps = {
  server: BareMetal.v1.Server
  toggleIsDetailOpen: () => void
}

export const ServerAction = ({ server, toggleIsDetailOpen }: ServerActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getServerUrl(server)} />
    <Action.CopyToClipboard content={getServerUrl(server)} />
  </ActionPanel>
)
