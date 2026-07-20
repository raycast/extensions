import { List } from "@raycast/api";

export type FreshSortingType = "from-10" | "from5" | "from10" | "all";

export const FRESH_SORTING_OPTIONS = [
  { id: "from-10", name: "New" },
  { id: "from5", name: "From +5" },
  { id: "from10", name: "From +10" },
  { id: "all", name: "All" },
] as const;

interface FreshSortingDropdownProps {
  readonly onSortingChange: (value: string) => void;
}

export function FreshSortingDropdown({ onSortingChange }: FreshSortingDropdownProps) {
  return (
    <List.Dropdown tooltip="Filter" storeValue={true} onChange={onSortingChange}>
      {FRESH_SORTING_OPTIONS.map((option) => (
        <List.Dropdown.Item key={option.id} title={option.name} value={option.id} />
      ))}
    </List.Dropdown>
  );
}
