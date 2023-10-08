import { List } from '@raycast/api'
import type { Registry } from '@scaleway/sdk'
import { getIconFromLocality } from '../../../../helpers/locality'

type NamespaceDetailProps = {
  namespace: Registry.v1.Namespace
}

export const NamespaceDetail = ({ namespace }: NamespaceDetailProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="ID" text={namespace.id} />
        <List.Item.Detail.Metadata.Label
          title="Region"
          text={namespace.region}
          icon={{ source: getIconFromLocality(namespace.region) }}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Endpoint" text={namespace.endpoint} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={namespace.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={namespace.updatedAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={namespace.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={namespace.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
