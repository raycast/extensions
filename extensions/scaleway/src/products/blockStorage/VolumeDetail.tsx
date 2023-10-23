import { List } from '@raycast/api'
import type { Block } from '@scaleway/sdk'
import { bytesToSize } from '../../helpers/bytesToSize'
import { getIconFromLocality } from '../../helpers/locality'
import { getVolumeStatusIcon } from './status'

type VolumeProps = {
  volume: Block.v1alpha1.Volume
}

export const VolumeDetail = ({ volume }: VolumeProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={volume.status}
          icon={getVolumeStatusIcon(volume)}
        />
        <List.Item.Detail.Metadata.Label title="ID" text={volume.id} />
        <List.Item.Detail.Metadata.Label
          title="Zone"
          text={volume.zone}
          icon={{ source: getIconFromLocality(volume.zone) }}
        />

        {volume.tags.length > 0 && (
          <List.Item.Detail.Metadata.TagList title="Tags">
            {volume.tags.map((tag) => (
              <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        )}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Type" text={volume.type} />
        <List.Item.Detail.Metadata.Label title="Size" text={bytesToSize(volume.size)} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Created At"
          text={volume.createdAt?.toDateString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Updated At"
          text={volume.updatedAt?.toDateString()}
        />
        {/* <List.Item.Detail.Metadata.Label
          title="Deletable At"
          text={volume.deletableAt?.toDateString()}
        /> */}

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Project ID" text={volume.projectId} />
        {/* <List.Item.Detail.Metadata.Label title="Organization ID" text={volume.organizationId} /> */}
      </List.Item.Detail.Metadata>
    }
  />
)
