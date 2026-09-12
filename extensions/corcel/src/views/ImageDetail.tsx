import { Action, ActionPanel, Detail } from "@raycast/api";
import { GeneratedImage } from "../lib/image";
import { DownloadImageAction } from "../actions";
import { fromClientRangeToModelRange } from "../lib/image/model-step";

const ImageDetail: React.FC<{ image: GeneratedImage }> = ({ image }) => {
  const date = new Date(image.created_on);

  return (
    <Detail
      markdown={`![](${image.url})`}
      actions={
        <ActionPanel>
          <DownloadImageAction image={image} />
          <Action.CopyToClipboard title="Copy Image URL" content={image.url} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Prompt" text={image.config.prompt} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Model">
            <Detail.Metadata.TagList.Item text={image.config.engine} color="white" />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Time"
            text={`${date.toDateString()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, "00")}`}
          />
          <Detail.Metadata.Label title="Height" text={image.config.height} />
          <Detail.Metadata.Label title="Width" text={image.config.width} />
          <Detail.Metadata.Label
            title="Steps"
            text={`${image.config.steps.toString()} (${fromClientRangeToModelRange(image.config.steps, image.config.engine)} in ${image.config.engine})`}
          />
          <Detail.Metadata.Label title="Guidance Scale" text={image.config.cfg_scale.toString()} />
        </Detail.Metadata>
      }
    />
  );
};

export default ImageDetail;
