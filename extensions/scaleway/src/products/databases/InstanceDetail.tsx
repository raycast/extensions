import { Icon, List } from '@raycast/api'
import type { RDB } from '@scaleway/sdk'
import { bytesToSize } from '../../helpers/bytesToSize'
import { getIconFromLocality } from '../../helpers/locality'
import { getInstanceStatusIcon } from './status'

type ServerProps = {
  instance: RDB.v1.Instance
}

const getVolumeType = (volumeType?: RDB.v1.VolumeType) => {
  if (volumeType === 'bssd') {
    return 'Block'
  }
  if (volumeType === 'lssd') {
    return 'Local'
  }

  return 'Unknown'
}

export const InstanceDetail = ({ instance }: ServerProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.TagList title="Status">
          <List.Item.Detail.Metadata.TagList.Item
            text={instance.status}
            color={getInstanceStatusIcon(instance).tintColor}
          />
        </List.Item.Detail.Metadata.TagList>

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="ID" text={instance.id} />
        <List.Item.Detail.Metadata.Label title="Name" text={instance.name} />
        <List.Item.Detail.Metadata.Label title="Engine" text={instance.engine} />
        <List.Item.Detail.Metadata.Label
          title="Region"
          text={instance.region}
          icon={getIconFromLocality(instance.region)}
        />
        {instance.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {instance.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Type"
          icon={Icon.ComputerChip}
          text={instance.nodeType.toUpperCase()}
        />
        <List.Item.Detail.Metadata.Label
          title="Volume"
          text={`${bytesToSize(instance.volume?.size)} (${getVolumeType(
            instance.volume?.type
          )} storage)`}
        />
        <List.Item.Detail.Metadata.Label
          title="High availability"
          text={instance.isHaCluster ? 'Yes' : 'No'}
        />
        <List.Item.Detail.Metadata.Label
          title="Read replicas"
          text={instance.readReplicas.length.toString()}
        />

        {instance.endpoints.map((endpoint) =>
          endpoint.ip ? (
            <List.Item.Detail.Metadata.Label
              key={endpoint.id}
              title="Endpoint"
              text={`${endpoint.ip}:${endpoint.port}`}
            />
          ) : null
        )}
      </List.Item.Detail.Metadata>
    }
  />
)
