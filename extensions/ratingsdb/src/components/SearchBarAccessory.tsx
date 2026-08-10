import { List } from "@raycast/api";
import { SearchBarAccessoryProps } from "../types";

export default function SearchBarAccessory({ setViewType }: SearchBarAccessoryProps) {
  return (
    <List.Dropdown tooltip="View" storeValue onChange={(newValue) => setViewType(newValue)}>
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Item title="Movies" value="movie" />
      <List.Dropdown.Item title="TV Series" value="series" />
    </List.Dropdown>
  );
}
