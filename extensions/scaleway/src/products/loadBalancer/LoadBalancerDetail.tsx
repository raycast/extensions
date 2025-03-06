import { List } from '@raycast/api'
import type { LB } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getLoadBalancerStatusIcon } from './status'

type LoadBalancerProps = {
  loadBalancer: LB.v1.Lb
}

export const LoadBalancerDetail = ({ loadBalancer }: LoadBalancerProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={loadBalancer.status}
          icon={getLoadBalancerStatusIcon(loadBalancer)}
        />
        <List.Item.Detail.Metadata.Label title="ID" text={loadBalancer.id} />
        <List.Item.Detail.Metadata.Label
          title="Zone"
          text={loadBalancer.zone}
          icon={{ source: getIconFromLocality(loadBalancer.zone) }}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={loadBalancer.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={loadBalancer.updatedAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={loadBalancer.projectId} />
        <List.Item.Detail.Metadata.Label
          title="Organization ID"
          text={loadBalancer.organizationId}
        />
      </List.Item.Detail.Metadata>
    }
  />
)
