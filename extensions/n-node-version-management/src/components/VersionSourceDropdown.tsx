import { List } from "@raycast/api";

export enum VersionSourceDropdownValue {
  Installed = "installed",
  All = "all",
}

export function VersionSourceDropdown(props: {
  filter: VersionSourceDropdownValue;
  onFilterUpdated: (newValue: VersionSourceDropdownValue) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Filter Versions"
      value={props.filter}
      onChange={(newValue) => props.onFilterUpdated(newValue as VersionSourceDropdownValue)}
    >
      <List.Dropdown.Item title="Installed" value={VersionSourceDropdownValue.Installed} />
      <List.Dropdown.Item title="Installed and Available" value={VersionSourceDropdownValue.All} />
    </List.Dropdown>
  );
}
