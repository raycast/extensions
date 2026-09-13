import * as windows from "./platform/windows";
import * as macos from "./platform/macos";
import { WifiStatus, WifiNetwork } from "./types";

const isWindows = process.platform === "win32";

export async function getWifiStatus(): Promise<WifiStatus> {
  return isWindows ? windows.getWindowsWifiStatus() : macos.getMacWifiStatus();
}

export async function toggleWifi(targetState?: boolean): Promise<boolean> {
  return isWindows
    ? windows.toggleWindowsWifi(targetState)
    : macos.toggleMacWifi(targetState);
}

export async function getWifiNetworks(
  activeScan = true,
): Promise<WifiNetwork[]> {
  return isWindows
    ? windows.getWindowsWifiNetworks(activeScan)
    : macos.getMacWifiNetworks();
}

export async function connectWifi(
  ssid: string,
  password?: string,
): Promise<void> {
  return isWindows
    ? windows.connectWindowsWifi(ssid, password)
    : macos.connectMacWifi(ssid, password);
}

export async function disconnectWifi(): Promise<void> {
  return isWindows
    ? windows.disconnectWindowsWifi()
    : macos.disconnectMacWifi();
}

export async function getWifiPassword(
  ssid: string,
): Promise<string | undefined> {
  return isWindows ? windows.getWindowsWifiPassword(ssid) : undefined;
}

export async function openWifiSettings(): Promise<void> {
  return isWindows
    ? windows.openWindowsWifiSettings()
    : macos.openMacWifiSettings();
}

export {
  getInternetSpeed,
  getCachedInternetSpeed,
  formatBytes,
  formatGigaBytes,
  calculateSessionUsage,
  clearSessionBaseline,
  type InternetSpeedResult,
  type SessionDataUsage,
  type StoredBaseline,
} from "./speedService";
