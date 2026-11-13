import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { platformShortcut } from "./shortcuts";
import { Item, Vault } from "./types";

export type SortOrder = "mostUsed" | "name" | "modified" | "created";
export type VaultSortOrder = "name" | "itemCount" | "mostUsed";

const SORT_ORDERS: SortOrder[] = ["mostUsed", "name", "modified", "created"];
const VAULT_SORT_ORDERS: VaultSortOrder[] = ["name", "itemCount", "mostUsed"];

/** The order item lists open with, from the Sort items by preference of Browse Items or Get TOTP Code. */
export function preferredSortOrder(): SortOrder {
  const value = getPreferenceValues<Preferences.SearchItems | Preferences.GetTotp>().sortBy;
  return SORT_ORDERS.find((order) => order === value) ?? "mostUsed";
}

/** The order Browse Items shows the vaults in, from its Sort vaults by preference. */
export function preferredVaultSortOrder(): VaultSortOrder {
  const value = getPreferenceValues<Preferences.SearchItems>().sortVaultsBy;
  return VAULT_SORT_ORDERS.find((order) => order === value) ?? "name";
}

export function compareNames(a: Item, b: Item): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true });
}

/** Newest first. Items without the date, e.g. saved by an earlier version until the next refresh, come last. */
function compareDates(date: (item: Item) => string | undefined) {
  const timeOf = (item: Item) => Date.parse(date(item) ?? "") || 0;
  return (a: Item, b: Item) => timeOf(b) - timeOf(a) || compareNames(a, b);
}

/**
 * Items in the given order. Most Used is Raycast's frecency sorting, which only the list knows, so it's given here
 * already sorted.
 */
export function sortItems<T extends Item>(items: T[], order: SortOrder, mostUsed: T[]): T[] {
  if (order === "mostUsed") return mostUsed;
  if (order === "name") return [...items].sort(compareNames);
  return [...items].sort(compareDates(order === "modified" ? (item) => item.modifiedAt : (item) => item.createdAt));
}

function compareVaultNames(a: Vault, b: Vault): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
}

/** The vaults opened most from Raycast first, from the vault list or a vault menu, then the others by name. */
export function useVaultFrecency<T extends Vault>(vaults: T[]) {
  return useFrecencySorting(vaults, {
    key: (vault) => vault.shareId,
    namespace: "vaults",
    sortUnvisited: compareVaultNames,
  });
}

/**
 * Vaults in the given order, Most Used given already sorted as for items. Item Count puts the vaults with the most
 * items first, and those not counted yet last.
 */
export function sortVaults<T extends Vault>(
  vaults: T[],
  order: VaultSortOrder,
  countOf: (vault: T) => number | undefined,
  mostUsed: T[],
): T[] {
  if (order === "mostUsed") return mostUsed;
  if (order === "name") return [...vaults].sort(compareVaultNames);
  return [...vaults].sort((a, b) => (countOf(b) ?? -1) - (countOf(a) ?? -1) || compareVaultNames(a, b));
}

/** Named as in the Sort items by preference, the current order checked. */
export function SortByMenu({ value, onChange }: { value: SortOrder; onChange: (order: SortOrder) => void }) {
  const icon = (order: SortOrder) => (order === value ? Icon.CheckCircle : Icon.Circle);
  return (
    <ActionPanel.Submenu title="Sort by" icon={Icon.NumberList} shortcut={platformShortcut(["cmd", "shift"], "s")}>
      <Action title="Most Used" icon={icon("mostUsed")} onAction={() => onChange("mostUsed")} />
      <Action title="Name" icon={icon("name")} onAction={() => onChange("name")} />
      <Action title="Last Modified" icon={icon("modified")} onAction={() => onChange("modified")} />
      <Action title="Date Created" icon={icon("created")} onAction={() => onChange("created")} />
    </ActionPanel.Submenu>
  );
}

/** List Vaults' search bar menu, which the vault list has free since it shows every vault. */
export function SortVaultsByDropdown({
  value,
  onChange,
}: {
  value: VaultSortOrder;
  onChange: (order: VaultSortOrder) => void;
}) {
  return (
    <List.Dropdown tooltip="Sort Vaults" value={value} onChange={(order) => onChange(order as VaultSortOrder)}>
      <List.Dropdown.Item title="Sort by Name" value="name" icon={Icon.NumberList} />
      <List.Dropdown.Item title="Sort by Item Count" value="itemCount" icon={Icon.NumberList} />
      <List.Dropdown.Item title="Sort by Most Used" value="mostUsed" icon={Icon.NumberList} />
    </List.Dropdown>
  );
}

/** As SortByMenu, for the vault list, named as in the Sort vaults by preference. */
export function SortVaultsByMenu({
  value,
  onChange,
}: {
  value: VaultSortOrder;
  onChange: (order: VaultSortOrder) => void;
}) {
  const icon = (order: VaultSortOrder) => (order === value ? Icon.CheckCircle : Icon.Circle);
  return (
    <ActionPanel.Submenu title="Sort by" icon={Icon.NumberList} shortcut={platformShortcut(["cmd", "shift"], "s")}>
      <Action title="Name" icon={icon("name")} onAction={() => onChange("name")} />
      <Action title="Item Count" icon={icon("itemCount")} onAction={() => onChange("itemCount")} />
      <Action title="Most Used" icon={icon("mostUsed")} onAction={() => onChange("mostUsed")} />
    </ActionPanel.Submenu>
  );
}
