import { Color, Icon, List } from '@raycast/api'
import type { Registry } from '@scaleway/sdk'
import { bytesToSize } from '../../../../helpers/bytesToSize'
import { getIconFromLocality } from '../../../../helpers/locality'
import { getImageStatusIcon } from '../../status'

type ImageDetailProps = {
  image: Registry.v1.Image
  namespaces: Registry.v1.Namespace[]
}

export const getPrivacyAccessory = ({
  image,
  namespace,
}: {
  image: Registry.v1.Image
  namespace: Registry.v1.Namespace
}) => {
  switch (image.visibility) {
    case 'public':
      return { icon: { source: Icon.LockUnlocked, tintColor: Color.Green }, tooltip: 'Public' }
    case 'private':
      return { icon: Icon.Lock, tooltip: 'Private' }
    case 'inherit':
      if (namespace.isPublic) {
        return { icon: { source: Icon.LockUnlocked, tintColor: Color.Green }, tooltip: 'Public' }
      }

      return { icon: Icon.Lock, tooltip: 'Private' }
    case 'visibility_unknown':
      return { icon: Icon.QuestionMarkCircle, tooltip: 'Unknown' }
    default:
      return { icon: Icon.QuestionMarkCircle, tooltip: 'Unknown' }
  }
}

export const ImageDetail = ({ image, namespaces }: ImageDetailProps) => {
  const namespace = namespaces.find(({ id }) => id === image.namespaceId)

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={image.status}
            icon={getImageStatusIcon(image)}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="ID" text={image.id} />
          {namespace ? (
            <>
              <List.Item.Detail.Metadata.Label
                title="Region"
                text={namespace.region}
                icon={{ source: getIconFromLocality(namespace.region) }}
              />

              <List.Item.Detail.Metadata.Label
                title="Privacy"
                text={
                  getPrivacyAccessory({
                    image,
                    namespace,
                  }).tooltip
                }
                icon={
                  getPrivacyAccessory({
                    image,
                    namespace,
                  }).icon
                }
              />
            </>
          ) : null}

          <List.Item.Detail.Metadata.Label title="Size" text={bytesToSize(image.size)} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Created At"
            text={image.createdAt?.toDateString()}
          />
          <List.Item.Detail.Metadata.Label
            title="Updated At"
            text={image.updatedAt?.toDateString()}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Project ID" text={namespace?.projectId} />
          <List.Item.Detail.Metadata.Label
            title="Organization ID"
            text={namespace?.organizationId}
          />

          <List.Item.Detail.Metadata.Separator />

          {image.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {image.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
