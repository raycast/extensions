import { Action, ActionPanel, Icon, getPreferenceValues } from "@raycast/api";
import { platformShortcut } from "./shortcuts";
import { Item } from "./types";

export type SortOrder = "mostUsed" | "name" | "modified" | "created";

const SORT_ORDERS: SortOrder[] = ["mostUsed", "name", "modified", "created"];

/** The order lists open with, from the Sort By preference. */
export function preferredSortOrder(): SortOrder {
  const value = getPreferenceValues<Preferences>().sortBy;
  return SORT_ORDERS.find((order) => order === value) ?? "mostUsed";
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

/** Named as in the Sort By preference, the current order checked. */
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
