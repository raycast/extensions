import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { modelIdToName } from "@ts/constants";
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
      markdown={`![${item.generation.prompt.text}](${item.upscaled_image_url ?? item.image_url})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Prompt" text={item.generation.prompt.text}></Detail.Metadata.Label>
          <Detail.Metadata.Label title="Model" text={modelIdToName[item.generation.model_id]}></Detail.Metadata.Label>
          <Detail.Metadata.Label
            title="Guidance Scale"
            text={item.generation.guidance_scale.toLocaleString()}
          ></Detail.Metadata.Label>
          <Detail.Metadata.Label
            title="Width"
            text={(item.generation.width * (item.upscaled_image_url ? 4 : 1)).toLocaleString()}
          ></Detail.Metadata.Label>
          <Detail.Metadata.Label
            title="Height"
            text={(item.generation.height * (item.upscaled_image_url ? 4 : 1)).toLocaleString()}
          ></Detail.Metadata.Label>
        </Detail.Metadata>
      }
    ></Detail>
  );
}
