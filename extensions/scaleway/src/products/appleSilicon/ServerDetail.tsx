import { List } from '@raycast/api'
import type { AppleSilicon } from '@scaleway/sdk'
import { getIconFromLocality } from '../../helpers/locality'
import { getServerStatusIcon } from './status'

type ServerProps = {
  server: AppleSilicon.v1alpha1.Server
}

export const ServerDetail = ({ server }: ServerProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={server.status}
          icon={getServerStatusIcon(server)}
        />
        <List.Item.Detail.Metadata.Label title="ID" text={server.id} />
        <List.Item.Detail.Metadata.Label
          title="Zone"
          text={server.zone}
          icon={{ source: getIconFromLocality(server.zone) }}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Type" text={server.type} />
        <List.Item.Detail.Metadata.Label title="IP" text={server.ip} />
        <List.Item.Detail.Metadata.Label title="VNC" text={server.vncUrl.toString()} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={server.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={server.updatedAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Deletable At"
          text={server.deletableAt?.toDateString()}
        />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={server.projectId} />
        <List.Item.Detail.Metadata.Label title="Organization ID" text={server.organizationId} />
      </List.Item.Detail.Metadata>
    }
  />
)
