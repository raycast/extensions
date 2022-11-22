import { Color, Icon, List } from '@raycast/api'
import { Container } from '@scaleway/sdk'
import {
  getContainerStatusIcon,
  getImageName,
  getPrivacyAccessory,
  getRegistryName,
} from '../helpers/containers'

export default function ContainerDetail(container: Container.v1beta1.Container) {
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

          {container.errorMessage && (
            <List.Item.Detail.Metadata.Label
              title="Error"
              text={container.errorMessage}
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
            text={`${container.memoryLimit} Mo - ${container.cpuLimit} mCPU`}
          />
          <List.Item.Detail.Metadata.Label
            title="Scale"
            text={`${container.minScale} min - ${container.maxScale} max`}
          />
          <List.Item.Detail.Metadata.Label
            title="Maximum concurrency"
            text={`${container.maxConcurrency}`}
          />
          <List.Item.Detail.Metadata.Label title="Timeout" text={container.timeout} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Link
            title="Domain"
            text={container.domainName}
            target={`https://${container.domainName}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  )
}
