import { List } from "@raycast/api";

export function DirectionDropdown(props: { onSelectionChange: (newValue: string) => void }) {
  return (
    <List.Dropdown filtering={false} tooltip="Select Direction" storeValue={true} onChange={props.onSelectionChange}>
      <List.Dropdown.Item key="arrivals" title="Arrivals" value="true" />
      <List.Dropdown.Item key="departures" title="Departures" value="false" />
    </List.Dropdown>
  );
}
