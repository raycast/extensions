import { Action, ActionPanel } from '@raycast/api'
import type { K8S } from '@scaleway/sdk'
import { getClusterUrl } from './urls'

type ClusterActionProps = {
  cluster: K8S.v1.Cluster
  toggleIsDetailOpen: () => void
}

export const ClusterAction = ({ cluster, toggleIsDetailOpen }: ClusterActionProps) => (
  <ActionPanel>
    <Action title="More Information" onAction={toggleIsDetailOpen} />
    <Action.OpenInBrowser url={getClusterUrl(cluster)} />
    <Action.CopyToClipboard content={getClusterUrl(cluster)} />
  </ActionPanel>
)
