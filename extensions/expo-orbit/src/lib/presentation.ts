import { Color, Icon, Image } from "@raycast/api";
import { Device, OsType } from "./devices";

export const OS_TYPES: OsType[] = ["iOS", "Android", "tvOS", "watchOS"];

export function getDeviceIcon(device: Device): Image.ImageLike {
  const source = device.osType === "tvOS" ? Icon.Monitor : device.osType === "watchOS" ? Icon.Clock : Icon.Mobile;
  return { source, tintColor: device.isRunning ? Color.Green : Color.SecondaryText };
}

export function getOsLabel(device: Device): string {
  return device.osVersion ? `${device.osType} ${device.osVersion}` : device.osType;
}

export function getKindLabel(device: Device): string {
  if (device.kind === "device") return "Device";
  return device.kind === "emulator" ? "Emulator" : "Simulator";
}

export function getConnectionLabel(device: Device): string | undefined {
  if (device.kind !== "device") return undefined;
  if (device.connectionType === "Network") return "Wi-Fi";
  if (device.connectionType === "USB") return "USB";
  return undefined;
}

export function getStatusLabel(device: Device): string {
  if (device.kind === "device") return "Connected";
  return device.isRunning ? "Running" : "Shut Down";
}

/** The title of the action that boots a device, or shows it when it already runs. */
export function getLaunchTitle(device: Device): string {
  const kind = getKindLabel(device);
  return device.isRunning ? `Show ${kind}` : `Launch ${kind}`;
}

/** A dropdown label such as `iPhone 18 Pro (iOS 27.2) — Running`. */
export function getDeviceOptionTitle(device: Device): string {
  const os = device.osVersion ? ` (${getOsLabel(device)})` : "";
  const status = device.kind === "device" ? " — Connected" : device.isRunning ? " — Running" : "";
  return `${device.name}${os}${status}`;
}
