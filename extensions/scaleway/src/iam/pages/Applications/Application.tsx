import { List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'

type ApplicationProps = {
  application: IAM.v1alpha1.Application
}

export const Application = ({ application }: ApplicationProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Name" text={application.name} />
        <List.Item.Detail.Metadata.Label title="Description" text={application.description} />
        <List.Item.Detail.Metadata.Label
          title="API Keys link"
          text={application.nbApiKeys.toString()}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={application.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={application.updatedAt?.toDateString()}
        />
      </List.Item.Detail.Metadata>
    }
  />
)
