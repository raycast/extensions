import { List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'
import { Bearer } from './Bearer'

type APIKeyProps = {
  apiKey: IAM.v1alpha1.APIKey
}

export const APIkey = ({ apiKey }: APIKeyProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Access Key" text={apiKey.accessKey} />
        <List.Item.Detail.Metadata.Label title="Description" text={apiKey.description} />
        <List.Item.Detail.Metadata.Label title="Creation IP" text={apiKey.creationIp} />
        <List.Item.Detail.Metadata.Label
          title="Default Project Id"
          text={apiKey.defaultProjectId}
        />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={apiKey.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={apiKey.updatedAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Expiration Date"
          text={apiKey.expiresAt?.toDateString() ?? 'Never'}
        />

        <Bearer apiKey={apiKey} />
      </List.Item.Detail.Metadata>
    }
  />
)
