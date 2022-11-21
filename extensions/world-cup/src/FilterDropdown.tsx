import { List } from "@raycast/api";

function FilterDropdown({ handleChange }: { handleChange: (v: string) => void }) {
  return (
    <List.Dropdown onChange={handleChange} tooltip="Select filter">
      <List.Dropdown.Item title="Next matches" value="next" />
      <List.Dropdown.Item title="Previous matches" value="prev" />
      <List.Dropdown.Item title="All matches" value="all" />
    </List.Dropdown>
  );
}

export default FilterDropdown;
