import { List } from "@raycast/api";

export interface IntervalDropdownProps {
  value?: string;
  onChange: (interval: string) => void;
}

/**
 * Fallback default value for edge-cases
 * @internal
 */
export const INTERVAL_DROPDOWN_DEFAULT_VALUE = "480m";

/**
 * Shared dropdown for selecting beszel data intervals
 * @returns
 */
export function IntervalDropdown({ value = INTERVAL_DROPDOWN_DEFAULT_VALUE, onChange }: IntervalDropdownProps) {
  return (
    <List.Dropdown
      value={value}
      onChange={onChange}
      tooltip="Select an interval, default can be configured in the extension settings"
      defaultValue={INTERVAL_DROPDOWN_DEFAULT_VALUE}
    >
      <List.Dropdown.Item title="1 minute" value="1m" />
      <List.Dropdown.Item title="10 minutes" value="10m" />
      <List.Dropdown.Item title="20 minutes" value="20m" />
      <List.Dropdown.Item title="2 hours" value="120m" />
      <List.Dropdown.Item title="8 hours" value="480m" />
    </List.Dropdown>
  );
}
