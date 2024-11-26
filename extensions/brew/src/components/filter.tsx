import { List } from "@raycast/api";

export enum InstallableFilterType {
  all = "all",
  formulae = "formulae",
  casks = "casks",
}

export function InstallableFilterDropdown(props: { onSelect: (value: InstallableFilterType) => void }): JSX.Element {
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

export function placeholder(filter: InstallableFilterType): string {
  return `Search ${
    filter === InstallableFilterType.all
      ? "formulae or casks"
      : filter === InstallableFilterType.casks
        ? "casks"
        : "formulae"
  } by name${String.ellipsis}`;
}
