import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { files } from "dropbox";
import Directory from "./Directory";
import { getDirectoryViewURL } from "../api";

export interface IDirectoryItemProps {
  file: files.FolderMetadataReference;
}

export default function DirectoryItem(props: IDirectoryItemProps) {
  const { file } = props;

  return (
    <List.Item
      id={file.id || file.name}
      key={file.id || file.name}
      icon={Icon.Finder}
      title={file.name}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Directory"
            icon={Icon.ArrowRight}
            target={<Directory path={file.id} parent={file.path_display} />}
          />
          {file.path_display && <Action.OpenInBrowser url={encodeURI(getDirectoryViewURL(file.path_display))} />}
        </ActionPanel>
      }
    />
  );
}
