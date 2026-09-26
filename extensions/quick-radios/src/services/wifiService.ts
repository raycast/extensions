import * as windows from "./platform/windows";
import { WifiStatus, WifiNetwork } from "./types";

export async function getWifiStatus(): Promise<WifiStatus> {
  return windows.getWindowsWifiStatus();
}

export async function toggleWifi(targetState?: boolean): Promise<boolean> {
  return windows.toggleWindowsWifi(targetState);
}

export async function getWifiNetworks(
  activeScan = true,
): Promise<WifiNetwork[]> {
  return windows.getWindowsWifiNetworks(activeScan);
}

export async function connectWifi(
  ssid: string,
  password?: string,
): Promise<void> {
  return windows.connectWindowsWifi(ssid, password);
}

export async function disconnectWifi(): Promise<void> {
  return windows.disconnectWindowsWifi();
}

export async function forgetWifiNetwork(ssid: string): Promise<void> {
  return windows.forgetWindowsWifiNetwork(ssid);
}

export async function getWifiPassword(
  ssid: string,
): Promise<string | undefined> {
  return windows.getWindowsWifiPassword(ssid);
}

export async function openWifiSettings(): Promise<void> {
  return windows.openWindowsWifiSettings();
}

export async function openLocationSettings(): Promise<void> {
  return windows.openWindowsLocationSettings();
}

export const isLocationPermissionError = windows.isLocationPermissionError;

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
