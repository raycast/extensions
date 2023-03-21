import { List } from '@raycast/api'
import type { BareMetal } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getServerStatusIcon } from './status'

type ServerProps = {
  server: BareMetal.v1.Server
}

export const ServerDetail = ({ server }: ServerProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="Status">
          <List.Item.Detail.Metadata.TagList.Item
            text={server.status}
            color={getServerStatusIcon(server).tintColor}
          />
        </List.Item.Detail.Metadata.TagList>
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="ID" text={server.id} />
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

        <List.Item.Detail.Metadata.Label title="Boot Type" text={server.bootType} />
        <List.Item.Detail.Metadata.Label title="Domain" text={server.domain} />
        {server.ips.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Ips">
            {server.ips.map((ip) => (
              <List.Item.Detail.Metadata.TagList.Item key={ip.id} text={ip.address} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={server.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={server.updatedAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={server.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={server.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
