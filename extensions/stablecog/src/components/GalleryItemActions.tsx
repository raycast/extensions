import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { modelIdToName, schedulerIdToName } from "@ts/constants";
import { saveImage } from "@ts/helpers";
import { TOutput } from "@ts/types";

export default function GalleryItemActions({ item }: { item: TOutput }) {
  const { push } = useNavigation();
  return (
    <ActionPanel>
      <Action title="Show Details" onAction={() => push(<GalleryItemDetail item={item} />)}></Action>
    </ActionPanel>
  );
}

function GalleryItemDetail({ item }: { item: TOutput }) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action
            title="Save Image"
            icon={Icon.Download}
            onAction={() => {
              saveImage({ url: item.upscaled_image_url ?? item.image_url, id: item.id });
            }}
          ></Action>
          <Action.OpenInBrowser url={item.upscaled_image_url ?? item.image_url}></Action.OpenInBrowser>
        </ActionPanel>
      }
      markdown={`![${item.prompt_text}](${item.upscaled_image_url ?? item.image_url})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Prompt" text={item.prompt_text}></Detail.Metadata.Label>
          <Detail.Metadata.Label title="Model" text={modelIdToName[item.model_id]}></Detail.Metadata.Label>
          <Detail.Metadata.Label
            title="Guidance Scale"
            text={item.guidance_scale.toLocaleString()}
          ></Detail.Metadata.Label>
          <Detail.Metadata.Label
            title="Inference Steps"
            text={item.inference_steps.toLocaleString()}
          ></Detail.Metadata.Label>
          <Detail.Metadata.Label title="Scheduler" text={schedulerIdToName[item.scheduler_id]}></Detail.Metadata.Label>
          <Detail.Metadata.Label
            title="Width"
            text={(item.width * (item.upscaled_image_url ? 4 : 1)).toLocaleString()}
          ></Detail.Metadata.Label>
          <Detail.Metadata.Label
            title="Height"
            text={(item.height * (item.upscaled_image_url ? 4 : 1)).toLocaleString()}
          ></Detail.Metadata.Label>
        </Detail.Metadata>
      }
    ></Detail>
  );
}
