import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { files } from "dropbox";
import Directory from "./Directory";

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
          <PushAction title="Open Directory" icon={Icon.ArrowRight} target={<Directory path={file.id} />} />
        </ActionPanel>
      }
    />
  );
}
