import { Action, ActionPanel } from '@raycast/api'
import type { VPC } from '@scaleway/sdk'
import { getPrivateNetworkUrl } from './urls'

type PNActionProps = {
  privateNetwork: VPC.v2.PrivateNetwork
  toggleIsDetailOpen: () => void
}

export const PNAction = ({ privateNetwork, toggleIsDetailOpen }: PNActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getPrivateNetworkUrl(privateNetwork)} />
    <Action.CopyToClipboard content={getPrivateNetworkUrl(privateNetwork)} />
  </ActionPanel>
)
