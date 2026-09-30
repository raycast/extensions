import type { JSX } from "react";
import { List } from "@raycast/api";
import { DeviceOnlineFilterType } from "../utils/filters";

export { DeviceOnlineFilterType };

export function DeviceOnlineFilterDropdown(props: { onSelect: (value: DeviceOnlineFilterType) => void }): JSX.Element {
  return (
    <List.Dropdown
      tooltip="Filter devices"
      onChange={(value) => {
        props.onSelect(value as DeviceOnlineFilterType);
      }}
      storeValue
    >
      <List.Dropdown.Item value={DeviceOnlineFilterType.all} title="All" />
      <List.Dropdown.Item value={DeviceOnlineFilterType.Online} title="Online" />
      <List.Dropdown.Item value={DeviceOnlineFilterType.Offline} title="Offline" />
      <List.Dropdown.Item value={DeviceOnlineFilterType.On} title="On" />
      <List.Dropdown.Item value={DeviceOnlineFilterType.Off} title="Off" />
    </List.Dropdown>
  );
}

export function placeholder(filter: DeviceOnlineFilterType): string {
  if (filter === DeviceOnlineFilterType.On) return "Search On devices/switches by name";
  if (filter === DeviceOnlineFilterType.Off) return "Search Off devices/switches by name";
  if (filter === DeviceOnlineFilterType.Online) return "Search Online by name";
  if (filter === DeviceOnlineFilterType.Offline) return "Search Offline by name";
  return "Search Online & Offline by name";
}
