import { List, Icon } from "@raycast/api";
import { useVaultContext } from "~/context/vault";

const ALL_OPTION_VALUE = "";

export default function ListFolderDropdown() {
  const { folders, isLoading, currentFolderId, setFolder } = useVaultContext();

  if ((isLoading && folders.length === 0) || folders.length === 0) return null;

  return (
    <List.Dropdown
      tooltip="Select a folder"
      isLoading={isLoading}
      defaultValue={currentFolderId ?? ALL_OPTION_VALUE}
      onChange={setFolder}
    >
      <List.Dropdown.Item value={ALL_OPTION_VALUE} title="All" icon={Icon.Folder} />
      {folders.map((folder) => {
        const id = String(folder.id);

        return <List.Dropdown.Item key={id} value={id} title={folder.name} icon={Icon.Folder} />;
      })}
    </List.Dropdown>
  );
}
