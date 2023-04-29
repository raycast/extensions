import { Icon, List } from '@raycast/api'
import type { Instance } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getServerStatusIcon } from './status'

type ServerProps = {
  server: Instance.v1.Server
}

export const ServerDetail = ({ server }: ServerProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={server.state}
          icon={getServerStatusIcon(server)}
        />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="ID" text={server.id} />
        <List.Item.Detail.Metadata.Label title="Name" text={server.name} />
        <List.Item.Detail.Metadata.Label title="Image" text={server.image?.name || 'Unknown'} />
        <List.Item.Detail.Metadata.Label
          title="Zone"
          text={server.zone}
          icon={{ source: getIconFromLocality(server.zone) }}
        />
        {server.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {server.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="Type"
          icon={Icon.ComputerChip}
          text={server.commercialType.toUpperCase()}
        />
        <List.Item.Detail.Metadata.Label title="Architecture" text={server.arch} />
        <List.Item.Detail.Metadata.Label
          title="Security group"
          text={server.securityGroup?.name || 'Unknown'}
        />
        <List.Item.Detail.Metadata.Label
          title="Public IP"
          text={server.publicIp?.address || 'Unknown'}
        />
        {server.publicIp?.address && (
          <List.Item.Detail.Metadata.Link
            title="SSH"
            text="Open SSH terminal"
            target={`ssh://root@${server.publicIp.address}`}
          />
        )}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={server.project} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={server.organization} />
      </List.Item.Detail.Metadata>
    }
  />
)
