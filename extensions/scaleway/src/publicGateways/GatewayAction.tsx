import { Action, ActionPanel } from '@raycast/api'
import type { VPCGW } from '@scaleway/sdk'
import { getGatewayUrl } from './urls'

type GatewayActionProps = {
  gateway: VPCGW.v1.Gateway
  toggleIsDetailOpen: () => void
}

export const GatewayAction = ({ gateway, toggleIsDetailOpen }: GatewayActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getGatewayUrl(gateway)} />
    <Action.CopyToClipboard content={getGatewayUrl(gateway)} />
  </ActionPanel>
)
