import { List } from "@raycast/api";

interface FolderDropdownProps {
  folders: string[];
  onChange: (value: string) => void;
}

export function FolderDropdown({ folders, onChange }: FolderDropdownProps) {
  return (
    <List.Dropdown tooltip="Folder" onChange={onChange}>
      <List.Dropdown.Item title="All Folders" value="__all__" />
      <List.Dropdown.Item title="Root" value="" />
      {folders.map((f) => (
        <List.Dropdown.Item key={f} title={f} value={f} />
      ))}
    </List.Dropdown>
  );
}
