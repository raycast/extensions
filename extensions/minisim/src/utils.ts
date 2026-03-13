import { environment } from "@raycast/api";
import { Device } from "./types";

function getIconName(name: string) {
  const isDarkMode = environment.appearance === "dark";
  return `${name}${isDarkMode ? "_dark" : ""}.png`;
}

export function getDeviceIcon(deviceName: string) {
  if (deviceName.includes("Apple TV")) {
    return getIconName("appletv.fill");
  }

  if (deviceName.includes("TV")) {
    return getIconName("tv");
  }

  if (deviceName.includes("iPad") || deviceName.includes("Tablet")) {
    return getIconName("ipad.landscape");
  }

  if (deviceName.includes("Watch")) {
    return getIconName("applewatch");
  }

  return getIconName("iphone");
}

export function sortDevices(a: Device, b: Device) {
  if (a.booted === b.booted) {
    return 0;
  }
  if (a.booted) {
    return -1;
  }
  return 1;
}
