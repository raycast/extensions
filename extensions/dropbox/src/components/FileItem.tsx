import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { files } from "dropbox";
import { getFilePreviewURL } from "../api";

export interface IFileItemProps {
  file: files.FileMetadataReference;
}

export default function FileItem(props: IFileItemProps) {
  const { file } = props;

  const previewURL = file.preview_url || (file.path_lower && getFilePreviewURL(file.path_lower)) || "";

  return (
    <List.Item
      id={file.id || file.name}
      icon={Icon.Document}
      title={file.name}
      actions={<ActionPanel>{previewURL && <Action.OpenInBrowser url={encodeURI(previewURL)} />}</ActionPanel>}
    />
  );
}
