import { List } from '@raycast/api'
import type { VPC } from '@scaleway/sdk'
import { getIconFromLocality } from '../locality'

type PNProps = {
  privateNetwork: VPC.v1.PrivateNetwork
}

export const PNDetail = ({ privateNetwork }: PNProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="ID" text={privateNetwork.id} />
        <List.Item.Detail.Metadata.Label
          title="Zone"
          text={privateNetwork.zone}
          icon={{ source: getIconFromLocality(privateNetwork.zone) }}
        />

        {privateNetwork.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {privateNetwork.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Subnets"
          text={privateNetwork.subnets?.toString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={privateNetwork.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={privateNetwork.updatedAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={privateNetwork.projectId} />
        <List.Item.Detail.Metadata.Label
          title="Organization ID"
          text={privateNetwork.organizationId}
        />
      </List.Item.Detail.Metadata>
    }
  />
)
