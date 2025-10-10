import { exec } from "child_process";
import { promisify } from "util";
import { LocalStorage } from "@raycast/api";
import { BluetoothDevice, BLEDeviceInfo } from "./types";
import { SERIAL_NUMBER_KEY } from "./constants";

const execAsync = promisify(exec);

export async function getBluetoothDevices(): Promise<BluetoothDevice[]> {
  const platform = process.platform;
  const savedSerialNumber = await LocalStorage.getItem(SERIAL_NUMBER_KEY);

  try {
    if (platform === "darwin") {
      const { stdout } = await execAsync("/usr/sbin/system_profiler SPBluetoothDataType -json");
      const data = JSON.parse(stdout);

      const devices: BluetoothDevice[] = [];
      const bluetoothData = data.SPBluetoothDataType?.[0];

      const connectedDevices: Record<string, BLEDeviceInfo>[] = bluetoothData?.device_connected || [];
      connectedDevices.forEach((deviceObj) => {
        for (const [name, info] of Object.entries(deviceObj)) {
          if (typeof info === "object" && info !== null) {
            const deviceInfo = info as BLEDeviceInfo;
            devices.push({
              serialNumber: deviceInfo.device_serialNumber || "",
              name: name,
              address: deviceInfo.device_address || "Unknown",
              rssi: parseInt(deviceInfo.device_rssi || "0"),
              connected: true,
              paired: true,
              isSavedInLocalStorage: deviceInfo.device_serialNumber === savedSerialNumber,
            });
          }
        }
      });

      const pairedDevices: Record<string, BLEDeviceInfo>[] = bluetoothData?.device_not_connected || [];
      pairedDevices.forEach((deviceObj) => {
        for (const [name, info] of Object.entries(deviceObj)) {
          if (typeof info === "object" && info !== null) {
            const deviceInfo = info as BLEDeviceInfo;
            devices.push({
              serialNumber: deviceInfo.device_serialNumber || "",
              name: name,
              address: deviceInfo.device_address || "Unknown",
              rssi: 0,
              connected: false,
              paired: true,
              isSavedInLocalStorage: deviceInfo.device_serialNumber === savedSerialNumber,
            });
          }
        }
      });

      return devices;
    }
  } catch (error) {
    console.error("Error discovering Bluetooth devices:", error);
    throw error;
  }
  return [];
}

export async function lockDevice() {
  await execAsync(
    'osascript -e \'tell application "System Events" to keystroke "q" using {control down, command down}\' ',
  );
}
