import { List } from '@raycast/api'
import type { VPCGW } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getGatewayStatusIcon } from './status'

type GatewayProps = {
  gateway: VPCGW.v1.Gateway
}

export const GatewayDetail = ({ gateway }: GatewayProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="Status">
          <List.Item.Detail.Metadata.TagList.Item
            text={gateway.status}
            color={getGatewayStatusIcon(gateway).tintColor}
          />
        </List.Item.Detail.Metadata.TagList>
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="ID" text={gateway.id} />
        <List.Item.Detail.Metadata.Label
          title="Zone"
          text={gateway.zone}
          icon={{ source: getIconFromLocality(gateway.zone) }}
        />

        {gateway.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {gateway.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        {gateway.ip ? (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Public IP"
              text={gateway.ip.address.toString()}
            />
            <List.Item.Detail.Metadata.Label
              title="IP Reverse"
              text={gateway.ip.reverse?.toString()}
            />
          </>
        ) : null}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Smtp"
          text={gateway.smtpEnabled ? 'Activated' : 'Deactivated'}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={gateway.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={gateway.updatedAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={gateway.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={gateway.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
