import { List } from "@raycast/api";

export type SortingType = "date" | "hotness";

export const SORTING_OPTIONS = [
  { id: "date", name: "By date" },
  { id: "hotness", name: "By popularity" },
] as const;

interface SortingDropdownProps {
  readonly onSortingChange: (value: string) => void;
}

export function SortingDropdown({ onSortingChange }: SortingDropdownProps) {
  return (
    <List.Dropdown tooltip="Sorting" storeValue={true} onChange={onSortingChange}>
      {SORTING_OPTIONS.map((option) => (
        <List.Dropdown.Item key={option.id} title={option.name} value={option.id} />
      ))}
    </List.Dropdown>
  );
}
