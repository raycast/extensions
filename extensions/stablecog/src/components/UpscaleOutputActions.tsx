import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { saveImage } from "@ts/helpers";
import { TUpscaleCreationOutput } from "@ts/types";

export default function UpscaleOutputActions({ item }: { item: TUpscaleCreationOutput }) {
  const { push } = useNavigation();
  return (
    <ActionPanel>
      <Action title="Show Details" onAction={() => push(<UpscaleOutputDetail item={item} />)}></Action>
    </ActionPanel>
  );
}

function UpscaleOutputDetail({ item }: { item: TUpscaleCreationOutput }) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action
            title="Save Image"
            icon={Icon.Download}
            onAction={() => {
              saveImage({ url: item.url, id: item.id });
            }}
          ></Action>
          <Action.OpenInBrowser url={item.url}></Action.OpenInBrowser>
        </ActionPanel>
      }
      markdown={`![${item.id}](${item.url})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={item.id}></Detail.Metadata.Label>
          <Detail.Metadata.Label title="URL" text={item.url}></Detail.Metadata.Label>
        </Detail.Metadata>
      }
    ></Detail>
  );
}
