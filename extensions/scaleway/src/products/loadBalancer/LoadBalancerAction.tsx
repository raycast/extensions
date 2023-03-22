import { Action, ActionPanel } from '@raycast/api'
import type { LB } from '@scaleway/sdk'
import { getLoadBalancerUrl } from './urls'

type LoadBalancerProps = {
  loadBalancer: LB.v1.Lb
  toggleIsDetailOpen: () => void
}

export const LoadBalancerAction = ({ loadBalancer, toggleIsDetailOpen }: LoadBalancerProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getLoadBalancerUrl(loadBalancer)} />
    <Action.CopyToClipboard content={getLoadBalancerUrl(loadBalancer)} />
  </ActionPanel>
)
