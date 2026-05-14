import { Action, ActionPanel } from '@raycast/api'
import type { Vpcv2 } from '@scaleway/sdk'
import { getPrivateNetworkUrl } from './urls'

type PNActionProps = {
  privateNetwork: Vpcv2.PrivateNetwork
  toggleIsDetailOpen: () => void
}

export const PNAction = ({ privateNetwork, toggleIsDetailOpen }: PNActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getPrivateNetworkUrl(privateNetwork)} />
    <Action.CopyToClipboard content={getPrivateNetworkUrl(privateNetwork)} />
  </ActionPanel>
)
