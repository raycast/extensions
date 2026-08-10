import { List } from "@raycast/api";

export type PeriodType = "today" | "day" | "week" | "month" | "year" | "all";

// Maps period type to API sorting parameter
export function getPeriodSorting(period: PeriodType): string {
  // "today" uses hotness sorting (current day's hot posts)
  if (period === "today") return "hotness";
  // Other periods use the period name directly as sorting value
  return period;
}

export const PERIOD_OPTIONS = [
  { id: "today", name: "Today" },
  { id: "day", name: "24 hours" },
  { id: "week", name: "This week" },
  { id: "month", name: "This month" },
  { id: "year", name: "This year" },
  { id: "all", name: "All time" },
] as const;

interface PeriodDropdownProps {
  readonly onPeriodChange: (value: string) => void;
}

export function PeriodDropdown({ onPeriodChange }: PeriodDropdownProps) {
  return (
    <List.Dropdown tooltip="Period" storeValue={true} onChange={onPeriodChange}>
      {PERIOD_OPTIONS.map((option) => (
        <List.Dropdown.Item key={option.id} title={option.name} value={option.id} />
      ))}
    </List.Dropdown>
  );
}
