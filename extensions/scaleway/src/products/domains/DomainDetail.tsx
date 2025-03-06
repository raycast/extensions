import { List } from '@raycast/api'
import type { Domain } from '@scaleway/sdk'
import { getDomainStatusIcon } from './status'

type DomainProps = {
  domain: Domain.v2beta1.DomainSummary
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
        <List.Item.Detail.Metadata.Label title="Domain" text={domain.domain} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Type"
          text={domain.isExternal ? 'External' : 'Internal'}
        />

        <List.Item.Detail.Metadata.Label title="Registrar" text={domain.registrar} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Expired At"
          text={domain.expiredAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Update At"
          text={domain.updatedAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label title="Epp Code" text={domain.eppCode.toString()} />

        <List.Item.Detail.Metadata.Separator />
        {domain.transferRegistrationStatus ? (
          <List.Item.Detail.Metadata.Label
            title="Transfer Status"
            text={domain.transferRegistrationStatus.status}
          />
        ) : null}

        <List.Item.Detail.Metadata.Label title="DNS Status" text={domain.dnssecStatus} />

        <List.Item.Detail.Metadata.Label title="Auto Renew Status" text={domain.autoRenewStatus} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={domain.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={domain.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
