import { List } from '@raycast/api'
import type { K8S } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getClusterStatusIcon } from './status'

type ClusterDetailProps = {
  cluster: K8S.v1.Cluster
}

export const ClusterDetail = ({ cluster }: ClusterDetailProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={cluster.status}
          icon={getClusterStatusIcon(cluster)}
        />
        <List.Item.Detail.Metadata.Label title="ID" text={cluster.id} />
        <List.Item.Detail.Metadata.Label
          title="Region"
          text={cluster.region}
          icon={{ source: getIconFromLocality(cluster.region) }}
        />

        {cluster.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {cluster.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Type" text={cluster.type} />
        <List.Item.Detail.Metadata.Label title="CNI" text={cluster.cni} />
        <List.Item.Detail.Metadata.Label title="Cluster Version" text={cluster.version} />
        {cluster.upgradeAvailable ? (
          <List.Item.Detail.Metadata.Label title="Upgrade Cluster" text="Upgrade Available" />
        ) : null}

        {cluster.featureGates.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Feature Gates">
            {cluster.featureGates.map((featureGate) => (
              <List.Item.Detail.Metadata.TagList.Item key={featureGate} text={featureGate} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        {/* <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Link
          title="Cluster URL"
          text={cluster.clusterUrl}
          target={cluster.clusterUrl}
        />

        <List.Item.Detail.Metadata.Link
          title="Wildcard DNS"
          text={cluster.dnsWildcard}
          target={cluster.dnsWildcard}
        /> */}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={cluster.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={cluster.updatedAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={cluster.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={cluster.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
