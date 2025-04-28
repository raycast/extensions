import { List } from "@raycast/api";
import { SearchDropdownProps } from "../types";
import { searchDropdownList } from "../songs";

export const SearchDropdown = ({ onSearchFilterChange }: SearchDropdownProps) => {
  return (
    <List.Dropdown onChange={onSearchFilterChange} tooltip="Filter by search">
      {searchDropdownList.map((item) => (
        <List.Dropdown.Item key={item.value} title={item.title} value={item.value} />
      ))}
    </List.Dropdown>
  );
};
