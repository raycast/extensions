import { Detail } from "@raycast/api";
import { GoogleImageResult } from "../types";
import { ImageActionPanel } from "./ImageActionPanel";

type ImageDetailsProps = {
  item: GoogleImageResult;
};

export function ImageDetails(props: ImageDetailsProps) {
  const { title, mime, fileFormat, image } = props.item;
  const markdown = renderImageMarkdownDetails(props.item);

  return (
    <Detail
      markdown={markdown}
      actions={<ImageActionPanel result={props.item} detail={true} />}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={title} />
          {image.width && image.height && (
            <Detail.Metadata.Label title="Dimensions" text={`${image.width}px ${image.height}px`} />
          )}
          {mime && <Detail.Metadata.Label title="MIME Type" text={mime} />}
          {!mime && fileFormat && <Detail.Metadata.Label title="File Format" text={fileFormat} />}
          <Detail.Metadata.Label title="Source" text={image.contextLink} />
          <Detail.Metadata.Link title="Open Source" text="Visit Website" target={image.contextLink} />
        </Detail.Metadata>
      }
    />
  );
}

// Helper function to render markdown for image details
function renderImageMarkdownDetails(item: GoogleImageResult): string {
  // Check if the link is from Instagram
  const isInstagramLink = item.link.includes("instagram.com") || item.image.contextLink.includes("instagram.com");

  if (isInstagramLink) {
    // For Instagram, provide a markdown link instead of embedding the image directly
    return `

### Instagram Image
*Instagram images cannot be displayed directly due to embedding restrictions*

[View Original Instagram Image](${item.link}) 

`;
  }

  // For non-Instagram images, use the standard markdown image syntax
  return `

![${item.title}](${item.link.startsWith("http:") ? item.link.replace("http:", "https:") : item.link})

`;
}
