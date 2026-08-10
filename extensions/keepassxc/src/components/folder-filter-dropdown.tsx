import { Icon, List } from "@raycast/api";
import { JSX } from "react/jsx-runtime";

/**
 * A dropdown component to filter by folder
 *
 * @param {Object} props - The component props
 * @param {string[]} props.folders - The list of unique folder names
 * @param {(newValue: string) => void} props.onFolderChange - The function to be called when the selected folder changes
 * @returns {JSX.Element} - The dropdown component
 */
export default function FolderFilterDropdown(props: {
  folders: string[];
  onFolderChange: (newValue: string) => void;
}): JSX.Element {
  const { folders, onFolderChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter by Folder"
      defaultValue={""}
      onChange={(newValue) => {
        onFolderChange(newValue);
      }}
    >
      <List.Dropdown.Item title="All" key="-1" value="" />
      <List.Dropdown.Section title="Folder">
        {folders.map((folder, index) => (
          <List.Dropdown.Item key={index.toString()} title={folder} value={folder} icon={Icon.Folder} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
