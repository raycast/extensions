import { Color, Icon, List } from '@raycast/api'
import {
  getContainerStatusIcon,
  getImageName,
  getPrivacyAccessory,
  getRegistryName,
} from '../utils'
import { Container, ContainerDomain } from '../scaleway/types'

export default function ContainerDetails(container: Container & { domains: ContainerDomain[] }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={getContainerStatusIcon(container.status).tooltip}
              color={getContainerStatusIcon(container.status).value.tintColor}
            />
          </List.Item.Detail.Metadata.TagList>

          {container.error_message && (
            <List.Item.Detail.Metadata.Label
              title="Error"
              text={container.error_message}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="ID" text={container.id} />
          <List.Item.Detail.Metadata.Label title="Name" text={container.name} />
          <List.Item.Detail.Metadata.Label title="Registry" text={getRegistryName(container)} />
          <List.Item.Detail.Metadata.Label title="Image" text={getImageName(container)} />
          <List.Item.Detail.Metadata.Label
            title="Privacy"
            text={getPrivacyAccessory(container.privacy).tooltip}
            icon={getPrivacyAccessory(container.privacy).icon}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Resources"
            icon={Icon.ComputerChip}
            text={`${container.memory_limit} Mo - ${container.cpu_limit} mCPU`}
          />
          <List.Item.Detail.Metadata.Label
            title="Scale"
            text={`${container.min_scale} min - ${container.max_scale} max`}
          />
          <List.Item.Detail.Metadata.Label
            title="Maximum concurrency"
            text={`${container.max_concurrency}`}
          />
          <List.Item.Detail.Metadata.Label title="Timeout" text={container.timeout} />

          <List.Item.Detail.Metadata.Separator />

          {container.domains.length > 0 &&
            container.domains.map((domain) => (
              <List.Item.Detail.Metadata.Link
                key={domain.id}
                title="Domain"
                text={domain.hostname}
                target={domain.url}
              />
            ))}
          {container.domains.length === 0 && (
            <List.Item.Detail.Metadata.Link
              title="Domain"
              text={container.domain_name}
              target={`https://${container.domain_name}`}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
