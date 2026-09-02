import { Device, FunctionItem } from "./interfaces";

export enum DeviceOnlineFilterType {
  all = "all",
  Online = "Online",
  Offline = "Offline",
  On = "On",
  Off = "Off",
}

export interface DeviceSwitch {
  device: Device;
  status: FunctionItem;
}

/** A togglable switch data point: a boolean status whose code starts with "switch". */
export function isSwitchStatus(status: FunctionItem): boolean {
  return status.code.toLowerCase().startsWith("switch") && typeof status.value === "boolean";
}

export function extractSwitches(devices: Device[]): DeviceSwitch[] {
  return devices.flatMap((device) =>
    (device.status ?? []).filter(isSwitchStatus).map((status) => ({ device, status })),
  );
}

/** Device names are not unique in Tuya; ids are. */
export function deviceKey(device: Device): string {
  return `device-${device.id}`;
}

export function switchKey(deviceId: string, commandCode: string): string {
  return `${deviceId}:${commandCode}`;
}

function hasSwitchInState(device: Device, on: boolean): boolean {
  return (device.status ?? []).some((status) => isSwitchStatus(status) && status.value === on);
}

export function filterDevices(devices: Device[], filter: DeviceOnlineFilterType | string): Device[] {
  switch (filter) {
    case DeviceOnlineFilterType.Online:
      return devices.filter((device) => device.online);
    case DeviceOnlineFilterType.Offline:
      return devices.filter((device) => !device.online);
    case DeviceOnlineFilterType.On:
      return devices.filter((device) => hasSwitchInState(device, true));
    case DeviceOnlineFilterType.Off:
      return devices.filter((device) => hasSwitchInState(device, false));
    default:
      return devices;
  }
}
