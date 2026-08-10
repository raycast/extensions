import { Color, Detail } from "@raycast/api"

import { FRONTEND_BASE } from "@/constants"
import { getDetailsMarkdown, getLicenseName } from "@/functions/utils"

import { ImageActions } from "@/components/Actions"

interface DetailsProps {
  image: Image
}

/**
 * Generate the details view for an image. This renders the image, its
 * attribution, and its metadata such as ID, title, creator, license, dimensions
 * and tags.
 *
 * @param image - the image whose details are displayed
 * @return the `Detail` UI component
 */
export function Details({ image }: DetailsProps) {
  return (
    <Detail
      markdown={getDetailsMarkdown(image)}
      navigationTitle={image.id}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Link
            title="Openverse ID"
            text={image.id}
            target={`${FRONTEND_BASE}/image/${image.id}`}
          />
          <Detail.Metadata.Link
            title="Title"
            text={image.title}
            target={image.foreign_landing_url}
          />
          <Detail.Metadata.Link
            title="Creator"
            text={image.creator}
            target={image.creator_url}
          />
          <Detail.Metadata.Link
            title="License"
            text={getLicenseName(image.license, image.license_version)}
            target={image.license_url}
          />
          <Detail.Metadata.Label
            title="Dimensions"
            text={`${image.width}x${image.height}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Tags">
            {image.tags.map((tag) => (
              <Detail.Metadata.TagList.Item
                text={tag.name}
                color={Color.Yellow}
              />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={<ImageActions image={image} />}
    />
  )
}
