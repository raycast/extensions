import { List } from "@raycast/api";

function FilterDropdown({ handleChange }: { handleChange: (v: string) => void }) {
  return (
    <List.Dropdown onChange={handleChange} tooltip="Select Filter">
      <List.Dropdown.Item title="Next Matches" value="next" />
      <List.Dropdown.Item title="Previous Matches" value="prev" />
      <List.Dropdown.Item title="All Matches" value="all" />
    </List.Dropdown>
  );
}

export default FilterDropdown;
