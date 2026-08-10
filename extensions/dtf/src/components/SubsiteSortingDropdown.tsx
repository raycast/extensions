import { List } from "@raycast/api";

export type SubsiteSortingType = "new" | "hotness" | "month" | "year" | "all";

export const SUBSITE_SORTING_OPTIONS = [
  { id: "new", name: "Latest" },
  { id: "hotness", name: "Popular" },
  { id: "month", name: "Top month" },
  { id: "year", name: "Top year" },
  { id: "all", name: "Top all time" },
] as const;

interface SubsiteSortingDropdownProps {
  readonly onSortingChange: (value: string) => void;
}

export function SubsiteSortingDropdown({ onSortingChange }: SubsiteSortingDropdownProps) {
  return (
    <List.Dropdown tooltip="Sorting" storeValue={true} onChange={onSortingChange}>
      {SUBSITE_SORTING_OPTIONS.map((option) => (
        <List.Dropdown.Item key={option.id} title={option.name} value={option.id} />
      ))}
    </List.Dropdown>
  );
}
