/**
 * The "history window" dropdown in the search bar of every list view.
 */

import { List } from "@raycast/api";
import { RangeOption } from "../data/ranges";
import { TimeRange } from "../data/types";

interface RangeDropdownProps {
  /** The range selected when the dropdown first appears. */
  defaultValue: TimeRange;
  /** The ranges the app keeps enough history for. */
  options: RangeOption[];
  onChange: (range: TimeRange) => void;
}

/**
 * Uses `defaultValue` rather than `value`: a controlled dropdown that mounts after
 * the loading screen reports its first item through onChange before it applies
 * `value`, which reset every view to 5 minutes.
 */
export function RangeDropdown(props: RangeDropdownProps) {
  return (
    <List.Dropdown
      tooltip="History Window"
      defaultValue={props.defaultValue}
      onChange={(newValue) => props.onChange(newValue as TimeRange)}
    >
      {props.options.map((option) => (
        <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
      ))}
    </List.Dropdown>
  );
}
