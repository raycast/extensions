import { List } from '@raycast/api'
import type { Webhosting } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getHostingStatusIcon } from './status'

type HostingProps = {
  hosting: Webhosting.v1alpha1.Hosting
}

export const HostingDetail = ({ hosting }: HostingProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="Status">
          <List.Item.Detail.Metadata.TagList.Item
            text={hosting.status}
            color={getHostingStatusIcon(hosting).tintColor}
          />
        </List.Item.Detail.Metadata.TagList>

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="ID" text={hosting.id} />
        <List.Item.Detail.Metadata.Label title="Domain" text={hosting.domain} />
        <List.Item.Detail.Metadata.Label
          title="Region"
          text={hosting.region}
          icon={getIconFromLocality(hosting.region)}
        />
        {hosting.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {hosting.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={hosting.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={hosting.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
