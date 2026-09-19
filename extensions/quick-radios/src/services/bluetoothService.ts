import * as windows from "./platform/windows";
import * as macos from "./platform/macos";
import { BluetoothStatus, BluetoothDevice } from "./types";

const isWindows = process.platform === "win32";

export async function getBluetoothStatus(): Promise<BluetoothStatus> {
  return isWindows
    ? windows.getWindowsBluetoothStatus()
    : macos.getMacBluetoothStatus();
}

export async function toggleBluetooth(targetState?: boolean): Promise<boolean> {
  return isWindows
    ? windows.toggleWindowsBluetooth(targetState)
    : macos.toggleMacBluetooth(targetState);
}

export async function getBluetoothDevices(): Promise<BluetoothDevice[]> {
  return isWindows
    ? windows.getWindowsBluetoothDevices()
    : macos.getMacBluetoothDevices();
}

export async function toggleBluetoothDeviceConnection(
  deviceId: string,
  connect: boolean,
): Promise<void> {
  return isWindows
    ? windows.toggleWindowsBluetoothDeviceConnection(deviceId, connect)
    : macos.toggleMacBluetoothDeviceConnection(deviceId, connect);
}

export async function openBluetoothSettings(): Promise<void> {
  return isWindows
    ? windows.openWindowsBluetoothSettings()
    : macos.openMacBluetoothSettings();
}
