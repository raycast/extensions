import { List } from '@raycast/api'
import type { TransactionalEmail } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getDomainStatusIcon } from './status'

type DomainProps = {
  domain: TransactionalEmail.v1alpha1.Domain
}

export const DomainDetail = ({ domain }: DomainProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="Status">
          <List.Item.Detail.Metadata.TagList.Item
            text={domain.status}
            color={getDomainStatusIcon(domain).tintColor}
          />
        </List.Item.Detail.Metadata.TagList>
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="ID" text={domain.id} />
        <List.Item.Detail.Metadata.Label
          title="Region"
          text={domain.region}
          icon={{ source: getIconFromLocality(domain.region) }}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Sent Count"
          text={domain.statistics?.sentCount.toString()}
        />

        <List.Item.Detail.Metadata.Label
          title="Canceled Count"
          text={domain.statistics?.canceledCount.toString()}
        />

        <List.Item.Detail.Metadata.Label
          title="Failed Count"
          text={domain.statistics?.failedCount.toString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={domain.createdAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={domain.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={domain.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
