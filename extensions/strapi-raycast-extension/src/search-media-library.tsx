import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getFiles } from "./lib/services";
import { StrapiFile } from "./types";

export default function SearchMediaLibrary() {
  const files = getFiles();
  const { host } = getPreferenceValues();

  return (
    <List isShowingDetail isLoading={files.isLoading}>
      {files.data?.map((file: StrapiFile) => (
        <List.Item
          key={file.id}
          title={`${file.name}${file.ext}`}
          detail={
            <List.Item.Detail
              markdown={`![Illustration](${host}${file.url})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Alternative Text" text={`${file.alternativeText}`} />
                  <List.Item.Detail.Metadata.Label title="Caption" text={`${file.caption}`} />
                  <List.Item.Detail.Metadata.Label title="Mime Type" text={`${file.mime}`} />
                  <List.Item.Detail.Metadata.Label title="Dimensions" text={`${file.width} x ${file.height}`} />
                  <List.Item.Detail.Metadata.Label title="Size" text={`${file.size} kb`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy URL" content={`${host}${file.url}`} icon={Icon.Clipboard} />
              <Action.Open title="Open in Browser" target={`${host}${file.url}`} icon={Icon.ArrowNe} />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
