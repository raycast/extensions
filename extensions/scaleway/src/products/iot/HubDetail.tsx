import { List } from '@raycast/api'
import type { IOT } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getHubStatusIcon } from './status'

type HubProps = {
  hub: IOT.v1.Hub
}

export const HubDetail = ({ hub }: HubProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={hub.status}
          icon={getHubStatusIcon(hub)}
        />
        <List.Item.Detail.Metadata.Label title="ID" text={hub.id} />
        <List.Item.Detail.Metadata.Label
          title="Region"
          text={hub.region}
          icon={{ source: getIconFromLocality(hub.region) }}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Created At" text={hub.createdAt?.toDateString()} />
        <List.Item.Detail.Metadata.Label title="Updated At" text={hub.updatedAt?.toDateString()} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={hub.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={hub.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
