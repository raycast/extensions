import { List } from '@raycast/api'
import type { Webhostingv1 } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getHostingStatusIcon } from './status'

type HostingProps = {
  hosting: Webhostingv1.HostingSummary
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

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={hosting.projectId} />
      </List.Item.Detail.Metadata>
    }
  />
)
