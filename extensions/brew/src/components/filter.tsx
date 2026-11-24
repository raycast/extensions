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

/**
 * Show Installed's own filter. Dependencies are a filter here, not a hidden
 * toggle: a remembered "hide" left Show Installed opening without 165 packages
 * and nothing on screen saying so, while the dropdown always shows its choice.
 * The values for All, Formulae and Casks match `InstallableFilterType`, so a
 * choice stored before this filter existed still selects the same entry.
 */
export enum InstalledFilterType {
  all = "all",
  yours = "yours",
  formulae = "formulae",
  dependencies = "dependencies",
  casks = "casks",
}

export function InstalledFilterDropdown(props: { onSelect: (value: InstalledFilterType) => void }) {
  return (
    <List.Dropdown
      tooltip="Filter installed packages"
      onChange={(value) => props.onSelect(value as InstalledFilterType)}
      storeValue
    >
      <List.Dropdown.Item value={InstalledFilterType.all} title="All" />
      <List.Dropdown.Item value={InstalledFilterType.yours} title="Installed by You" />
      <List.Dropdown.Section>
        <List.Dropdown.Item value={InstalledFilterType.formulae} title="Formulae" />
        <List.Dropdown.Item value={InstalledFilterType.casks} title="Casks" />
        <List.Dropdown.Item value={InstalledFilterType.dependencies} title="Dependencies" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const INSTALLED_TARGET: Record<InstalledFilterType, string> = {
  [InstalledFilterType.all]: "installed packages",
  [InstalledFilterType.yours]: "packages you installed",
  [InstalledFilterType.formulae]: "formulae",
  [InstalledFilterType.dependencies]: "dependencies",
  [InstalledFilterType.casks]: "casks",
};

export function installedPlaceholder(filter: InstalledFilterType): string {
  return `Search ${INSTALLED_TARGET[filter]} by name${String.ellipsis}`;
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
