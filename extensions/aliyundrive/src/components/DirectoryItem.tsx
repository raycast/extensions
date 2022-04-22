import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { AliyunDrive } from "@chyroc/aliyundrive";
import Directory from "./Directory";

export interface IDirectoryItemProps {
  defaultDriveID: string;
  file: AliyunDrive.File;
}

export default function DirectoryItem(props: IDirectoryItemProps) {
  const { file } = props;

  return (
    <List.Item
      id={file.file_id || file.name}
      key={file.file_id || file.name}
      icon={Icon.Finder}
      title={file.name}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Directory"
            icon={Icon.ArrowRight}
            target={<Directory defaultDriveID={props.defaultDriveID} path={file.file_id} />}
          />
        </ActionPanel>
      }
    />
  );
}
