import { List } from "@raycast/api";

export enum InstallableFilterType {
  all = "all",
  formulae = "formulae",
  casks = "casks",
}

export function InstallableFilterDropdown(props: { onSelect: (value: InstallableFilterType) => void }) {
  return (
    <List.Dropdown
      tooltip="Filter by formula or cask"
      onChange={(value) => {
        props.onSelect(value as InstallableFilterType);
      }}
      storeValue
    >
      <List.Dropdown.Item value={InstallableFilterType.all} title="All" />
      <List.Dropdown.Item value={InstallableFilterType.formulae} title="Formulae" />
      <List.Dropdown.Item value={InstallableFilterType.casks} title="Casks" />
    </List.Dropdown>
  );
}

export function placeholder(filter: InstallableFilterType, sortByPopularity = false): string {
  const target =
    filter === InstallableFilterType.all
      ? "formulae or casks"
      : filter === InstallableFilterType.casks
        ? "casks"
        : "formulae";
  // Name the ordering: otherwise a popularity-sorted list is indistinguishable
  // from a relevance-sorted one that happens to look wrong.
  return `Search ${target} by name${sortByPopularity ? ", most installed first" : ""}${String.ellipsis}`;
}
