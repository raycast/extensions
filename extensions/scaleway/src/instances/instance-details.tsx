import { Icon, List } from '@raycast/api'
import { Instance } from '../scaleway/types'
import { getCountryImage, getInstanceStateIcon } from '../utils'

export default function InstanceDetails(instance: Instance) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={getInstanceStateIcon(instance.state).tooltip}
              color={getInstanceStateIcon(instance.state).value.tintColor}
            />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="ID" text={instance.id} />
          <List.Item.Detail.Metadata.Label title="Name" text={instance.name} />
          <List.Item.Detail.Metadata.Label title="Image" text={instance.image.name} />

          <List.Item.Detail.Metadata.Label
            title="Zone"
            text={instance.zone}
            icon={getCountryImage(instance.zone)}
          />
          {instance.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {instance.tags.map((tag, i) => (
                <List.Item.Detail.Metadata.TagList.Item key={i} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Type"
            icon={Icon.ComputerChip}
            text={instance.commercial_type.toUpperCase()}
          />
          <List.Item.Detail.Metadata.Label title="Architecture" text={instance.arch} />
          <List.Item.Detail.Metadata.Label
            title="Security group"
            text={instance.security_group.name}
          />
          <List.Item.Detail.Metadata.Label title="Public IP" text={instance.public_ip.address} />
          <List.Item.Detail.Metadata.Link
            title="SSH"
            text="Open SSH terminal"
            target={`ssh://root@${instance.public_ip.address}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  )
}
