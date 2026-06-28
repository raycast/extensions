import { List } from "@raycast/api";

export default function BookmarksDropdown(props: { folderNames: string[]; onSelection: (newValue: string) => void }) {
  return (
    <List.Dropdown
      tooltip="Select Bookmarks Folder"
      storeValue={true}
      onChange={(newValue) => {
        props.onSelection(newValue);
      }}
    >
      <List.Dropdown.Section title="Folders">
        {props.folderNames.map((folder) => {
          const folderName = folder || "Top Level Bookmarks";
          return <List.Dropdown.Item key={folderName} title={folderName} value={folderName} />;
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
