import { List } from '@raycast/api'
import type { Secret } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'

type SecretDetailProps = {
  secret: Secret.v1beta1.Secret
}

export const SecretDetail = ({ secret }: SecretDetailProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="ID" text={secret.id} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Region"
          text={secret.region}
          icon={{ source: getIconFromLocality(secret.region) }}
        />
        <List.Item.Detail.Metadata.Label title="Type" text={String(secret.versionCount)} />
        <List.Item.Detail.Metadata.Label title="Secret Versions" text={String(secret.type)} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={secret.updatedAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={secret.createdAt?.toDateString()}
        />
      </List.Item.Detail.Metadata>
    }
  />
)
