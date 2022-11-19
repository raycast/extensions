import { Icon, List } from '@raycast/api'
import { RedisCluster } from '../scaleway/types'
import { getCountryImage, getRedisClusterStatusIcon } from '../utils'

export default function RedisDetails(cluster: RedisCluster) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={getRedisClusterStatusIcon(cluster.status).tooltip}
              color={getRedisClusterStatusIcon(cluster.status).value.tintColor}
            />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="ID" text={cluster.id} />
          <List.Item.Detail.Metadata.Label title="Name" text={cluster.name} />
          <List.Item.Detail.Metadata.Label title="Version" text={cluster.version} />
          <List.Item.Detail.Metadata.Label
            title="Zone"
            text={cluster.zone}
            icon={getCountryImage(cluster.zone)}
          />
          {cluster.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {cluster.tags.map((tag, i) => (
                <List.Item.Detail.Metadata.TagList.Item key={i} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Type"
            icon={Icon.ComputerChip}
            text={cluster.node_type.toUpperCase()}
          />
          <List.Item.Detail.Metadata.Label title="Cluster size" text={`${cluster.cluster_size}`} />

          {cluster.endpoints.map((endpoint, i) => (
            <List.Item.Detail.Metadata.Label
              key={i}
              title="Endpoint"
              text={`${endpoint.ips[0]}:${endpoint.port}`}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
