import { List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'

type PolicyProps = {
  policy: IAM.v1alpha1.Policy
}

export const Policy = ({ policy }: PolicyProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Name" text={policy.name} />
        <List.Item.Detail.Metadata.Label title="Description" text={policy.description} />
        <List.Item.Detail.Metadata.Label title="ID" text={policy.id} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={policy.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={policy.updatedAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />
      </List.Item.Detail.Metadata>
    }
  />
)
