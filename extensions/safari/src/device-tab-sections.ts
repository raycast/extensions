import type { Device, Tab } from "./types";

export interface DeviceTabSection {
  device: Device;
  tabs: Tab[];
}

export function getDeviceTabSections(devices: Device[], getTabs: (device: Device) => Tab[]): DeviceTabSection[] {
  return devices.map((device) => ({ device, tabs: getTabs(device) })).filter((section) => section.tabs.length > 0);
}
