import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { files } from "dropbox";
import { downloadFile, getFilePreviewURL } from "../api";

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
      accessories={[{ date: new Date(file.server_modified) }]}
      actions={
        <ActionPanel>
          {previewURL && <Action.OpenInBrowser url={encodeURI(previewURL)} />}
          {file.path_lower && (
            <Action
              icon={Icon.Download}
              title="Download"
              onAction={() => downloadFile(file.name, file.path_lower as string)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
