import { List, Icon } from "@raycast/api";
import { Folder } from "~/types/vault";

export type ListFolderDropdownProps = {
  folders: Folder[];
  isLoading?: boolean;
};

const NO_FOLDER_VALUE = "no-folder";

export default function ListFolderDropdown({ folders, isLoading }: ListFolderDropdownProps) {
  return (
    <List.Dropdown tooltip="Select a folder" isLoading={isLoading} defaultValue={NO_FOLDER_VALUE} storeValue>
      {folders.map((folder) => {
        const id = folder.id ?? NO_FOLDER_VALUE;

        return <List.Dropdown.Item key={id} value={id} title={folder.name} icon={Icon.Folder} />;
      })}
    </List.Dropdown>
  );
}
