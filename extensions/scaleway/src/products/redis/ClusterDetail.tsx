import { Icon, List } from '@raycast/api'
import type { Redis } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getClusterStatusIcon } from './status'

type ClusterProps = {
  cluster: Redis.v1.Cluster
}

export const ClusterDetail = ({ cluster }: ClusterProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="Status">
          <List.Item.Detail.Metadata.TagList.Item
            text={cluster.status}
            color={getClusterStatusIcon(cluster).tintColor}
          />
        </List.Item.Detail.Metadata.TagList>

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="ID" text={cluster.id} />
        <List.Item.Detail.Metadata.Label title="Name" text={cluster.name} />
        <List.Item.Detail.Metadata.Label title="Version" text={cluster.version} />
        <List.Item.Detail.Metadata.Label
          title="Zone"
          text={cluster.zone}
          icon={getIconFromLocality(cluster.zone)}
        />
        {cluster.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {cluster.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Type"
          icon={Icon.ComputerChip}
          text={cluster.nodeType.toUpperCase()}
        />
        <List.Item.Detail.Metadata.Label title="Cluster size" text={`${cluster.clusterSize}`} />

        {cluster.endpoints.map((endpoint) => {
          const text = `${endpoint.ips[0] as string}:${endpoint.port}`

          return <List.Item.Detail.Metadata.Label key={endpoint.id} title="Endpoint" text={text} />
        })}
      </List.Item.Detail.Metadata>
    }
  />
)
