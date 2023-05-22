import { List, Icon } from "@raycast/api";
import { FOLDER_OPTIONS } from "~/constants/general";
import { useVaultContext } from "~/context/vault";

export default function ListFolderDropdown() {
  const { folders, isLoading, currentFolderId, setFolder } = useVaultContext();

  if ((isLoading && folders.length === 0) || folders.length === 0) return null;

  return (
    <List.Dropdown
      tooltip="Select a folder"
      isLoading={isLoading}
      defaultValue={currentFolderId ?? FOLDER_OPTIONS.ALL}
      onChange={setFolder}
    >
      <List.Dropdown.Item value={FOLDER_OPTIONS.ALL} title="All" icon={Icon.Folder} />
      {folders.map((folder) => {
        const id = folder.id || FOLDER_OPTIONS.NO_FOLDER;

        return <List.Dropdown.Item key={id} value={id} title={folder.name} icon={Icon.Folder} />;
      })}
    </List.Dropdown>
  );
}
