/**
 * Reusable device selector. The dashboard's mutating views (clients, aaa, drift,
 * backups) all pick a router from `GET /api/devices` first; this centralizes that
 * as a `List.Dropdown` search-bar accessory plus a `useDevices()` hook.
 */
import { List } from "@raycast/api";
import { useApi } from "./hooks";
import type { DevicesPayload } from "./types";

export function useDevices() {
  return useApi<DevicesPayload>("/api/devices");
}

export function DeviceDropdown(props: {
  devices: string[];
  value?: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  tooltip?: string;
}) {
  return (
    <List.Dropdown
      tooltip={props.tooltip ?? "Device"}
      storeValue
      value={props.value}
      onChange={props.onChange}
    >
      {props.includeAll ? (
        <List.Dropdown.Item title="All Devices" value="" />
      ) : null}
      {props.devices.map((d) => (
        <List.Dropdown.Item key={d} title={d} value={d} />
      ))}
    </List.Dropdown>
  );
}
