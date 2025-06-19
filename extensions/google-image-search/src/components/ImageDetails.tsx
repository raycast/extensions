import { Detail } from "@raycast/api";
import { GoogleImageResult } from "../types";
import { ImageActionPanel } from "./ImageActionPanel";

type ImageDetailsProps = {
  item: GoogleImageResult;
  mutate?: () => Promise<void>;
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
  return `

![${item.title}](${item.link})

`;
}
