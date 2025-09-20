import { Color, Icon, List } from '@raycast/api'
import type { Container } from '@scaleway/sdk'
import { getContainerStatusIcon } from './status'

type ContainerDetailProps = {
  container: Container.v1beta1.Container
  namespaces?: Container.v1beta1.Namespace[]
}

export const getPrivacyAccessory = (privacy: Container.v1beta1.ContainerPrivacy) => {
  switch (privacy) {
    case 'public':
      return { icon: { source: Icon.LockUnlocked, tintColor: Color.Green }, tooltip: 'Public' }
    case 'private':
      return { icon: Icon.Lock, tooltip: 'Private' }
    case 'unknown_privacy':
      return { icon: Icon.QuestionMarkCircle, tooltip: 'Unknown' }
    default:
      return { icon: Icon.QuestionMarkCircle, tooltip: 'Unknown' }
  }
}

export const getImageName = (container: Container.v1beta1.Container) =>
  container.registryImage.split('/').pop()

export const getRegistryName = (container: Container.v1beta1.Container) =>
  container.registryImage.substring(0, container.registryImage.lastIndexOf('/'))

export const ContainerDetail = ({ container, namespaces }: ContainerDetailProps) => {
  const namespace = (namespaces || []).find(({ id }) => id === container.namespaceId)

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={container.status}
            icon={getContainerStatusIcon(container)}
          />

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

          <List.Item.Detail.Metadata.Separator />

          {namespace ? (
            <>
              <List.Item.Detail.Metadata.Label title="Project ID" text={namespace.projectId} />
              <List.Item.Detail.Metadata.Label
                title="Organization ID"
                text={namespace.organizationId}
              />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
