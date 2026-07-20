import { List } from "@raycast/api";
import { useMemo } from "react";

// Helper function to render the provided date in the `[MONTH] [DAY], [YEAR]`
// format.
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Custom List Dropdown Component that allows the user to select any date within the past 7 days.
 * Initial value defaults to the current date.
 *
 * Note: The selected date value is not persisted between component renders.
 * The dropdown will always reset to the current date when the component is remounted.
 *
 * @param props.onDateChange - Callback function that is triggered when a date is selected.
 *                            It receives the newly selected Date object as a parameter.
 */
export function DateDropdown({ onDateChange }: { onDateChange: (newDate: Date) => void }) {
  const dates = useMemo(() => {
    const today = new Date();

    return [
      today,
      new Date(new Date(today).setDate(today.getDate() - 1)),
      new Date(new Date(today).setDate(today.getDate() - 2)),
      new Date(new Date(today).setDate(today.getDate() - 3)),
      new Date(new Date(today).setDate(today.getDate() - 4)),
      new Date(new Date(today).setDate(today.getDate() - 5)),
      new Date(new Date(today).setDate(today.getDate() - 6)),
    ];
  }, []);

  const onChange = (value: string) => onDateChange(new Date(value));

  return (
    <List.Dropdown tooltip="Select Date" onChange={onChange}>
      {dates.map((date) => (
        <List.Dropdown.Item key={date.toISOString()} title={formatDate(date)} value={date.toISOString()} />
      ))}
    </List.Dropdown>
  );
}
