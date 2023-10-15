import { List } from "@raycast/api";

const BookmarksFolderDropdown = (props: { folders: string[]; onChange: (folder: string) => unknown }) => (
  <List.Dropdown tooltip="Folder" storeValue={true} onChange={props.onChange}>
    <List.Dropdown.Section>
      <List.Dropdown.Item title="All" value="" />
      {props.folders.map((folder) => (
        <List.Dropdown.Item key={folder} title={folder} value={folder} />
      ))}
    </List.Dropdown.Section>
  </List.Dropdown>
);

export default BookmarksFolderDropdown;
