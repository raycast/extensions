import { Action, ActionPanel } from '@raycast/api'
import type { Vpcgwv1 } from '@scaleway/sdk'
import { getGatewayUrl } from './urls'

type GatewayActionProps = {
  gateway: Vpcgwv1.Gateway
  toggleIsDetailOpen: () => void
}

export const GatewayAction = ({ gateway, toggleIsDetailOpen }: GatewayActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getGatewayUrl(gateway)} />
    <Action.CopyToClipboard content={getGatewayUrl(gateway)} />
  </ActionPanel>
)
