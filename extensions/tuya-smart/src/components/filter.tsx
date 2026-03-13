import { List } from "@raycast/api";

export enum DeviceOnlineFilterType {
  all = "all",
  Online = "Online",
  Offline = "Offline",
  On = "On",
  Off = "Off",
}

export function DeviceOnlineFilterDropdown(props: { onSelect: (value: DeviceOnlineFilterType) => void }): JSX.Element {
  return (
    <List.Dropdown
      tooltip="Filter by formula or cask"
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
  return `Search ${
    filter === DeviceOnlineFilterType.all
      ? "Online & Offline"
      : filter === DeviceOnlineFilterType.Online
      ? "Online"
      : "Offline"
  } by name`;
}
