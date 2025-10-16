import { Action, ActionPanel } from '@raycast/api'
import type { Redis } from '@scaleway/sdk'
import { getClusterUrl } from './urls'

type ClusterActionProps = {
  cluster: Redis.v1.Cluster
  toggleIsDetailOpen: () => void
}

export const ClusterAction = ({ cluster, toggleIsDetailOpen }: ClusterActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getClusterUrl(cluster)} />
    <Action.CopyToClipboard content={getClusterUrl(cluster)} />
  </ActionPanel>
)
