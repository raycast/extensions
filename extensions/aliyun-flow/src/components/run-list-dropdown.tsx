import { List } from "@raycast/api";
import { STATUS_TO_COLOR_MAP } from "../constants";
import { StatusFilter } from "../types";

export function RunListDropdown(props: { onStatusChange: (newValue: StatusFilter) => void }) {
  const { onStatusChange } = props;

  return (
    <List.Dropdown
      tooltip="Filter Status"
      storeValue={true}
      onChange={(newValue) => {
        onStatusChange(newValue as StatusFilter);
      }}
    >
      <List.Dropdown.Section title="Filter By Status">
        {["ALL", ...(Object.keys(STATUS_TO_COLOR_MAP) as StatusFilter[])].map((statusItem) => (
          <List.Dropdown.Item key={statusItem} title={statusItem} value={statusItem} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
