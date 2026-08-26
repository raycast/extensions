import { Device, FunctionItem } from "./interfaces";
import { isSwitchStatus } from "./filters";

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * Resolves the free-text name an AI tool or user supplies to a single device.
 * Ranked so that an exact name always wins over a coincidental substring.
 */
export function findDeviceByName(devices: Device[], query: string): Device | undefined {
  const needle = normalize(query ?? "");
  if (!needle) return undefined;

  const byId = devices.find((device) => device.id === query);
  if (byId) return byId;

  return (
    devices.find((device) => normalize(device.name) === needle) ??
    devices.find((device) => normalize(device.name).startsWith(needle)) ??
    devices.find((device) => normalize(device.name).includes(needle)) ??
    devices.find((device) => needle.includes(normalize(device.name)))
  );
}

/** Picks the switch a request refers to, defaulting to the device's only switch. */
export function findSwitchOnDevice(device: Device, query?: string): FunctionItem | undefined {
  const switches = (device.status ?? []).filter(isSwitchStatus);
  if (switches.length === 0) return undefined;
  if (!query) return switches[0];

  const needle = normalize(query);
  return (
    switches.find((status) => normalize(status.name ?? "") === needle) ??
    switches.find((status) => normalize(status.code) === needle) ??
    switches.find((status) => normalize(status.name ?? status.code).includes(needle)) ??
    switches[0]
  );
}
