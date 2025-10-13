import { resolve } from "path";
import { readFileSync } from "fs";
import { runAppleScriptSync } from "run-applescript";
import { DevicesService } from "./devices.service";
import { RawDeviceData } from "./devices.types";
import { mapDevice } from "./devices.mapper";
import { Device } from "./devices.model";
import { execSync } from "child_process";

export default class ApplescriptDevicesService implements DevicesService {
  getDevices(): Device[] {
    const devicesData = this._fetchRawDevicesData();
    const mappedDevices = devicesData.map((deviceData) => this._mapDevice(deviceData));
    return mappedDevices;
  }

  connectDevice(mac: string): boolean {
    const formattedMacAddress = mac.toUpperCase().replaceAll(":", "-");
    const script = readFileSync(
      resolve(__dirname, this._getPath("assets/scripts/connectDevice.applescript"))
    ).toString();
    const getFirstMatchingDeviceScript = readFileSync(
      resolve(__dirname, this._getPath("assets/scripts/getFirstMatchingDevice.applescript"))
    ).toString();
    const exitCode = runAppleScriptSync(
      `
      use framework "IOBluetooth"\n
      use scripting additions\n
      \n
      ${getFirstMatchingDeviceScript}\n
      \n
      ${script}\n
      \n
      return connectDevice(getFirstMatchingDevice("${formattedMacAddress}"))`
    );
    return exitCode === "0";
  }

  disconnectDevice(mac: string): boolean {
    const formattedMacAddress = mac.toUpperCase().replaceAll(":", "-");
    const script = readFileSync(
      resolve(__dirname, this._getPath("assets/scripts/disconnectDevice.applescript"))
    ).toString();
    const getFirstMatchingDeviceScript = readFileSync(
      resolve(__dirname, this._getPath("assets/scripts/getFirstMatchingDevice.applescript"))
    ).toString();
    const exitCode = runAppleScriptSync(
      `
      use framework "IOBluetooth"\n
      use scripting additions\n
      \n
      ${getFirstMatchingDeviceScript}\n
      \n
      ${script}\n
      \n
      disconnectDevice(getFirstMatchingDevice("${formattedMacAddress}"))`
    );
    return exitCode === "0";
  }

  private _fetchRawDevicesData(): RawDeviceData[] {
    // Fetch Bluetooth data
    const script = readFileSync(
      resolve(__dirname, this._getPath("assets/scripts/getAllDevices.applescript"))
    ).toString();
    const fetchedData = runAppleScriptSync(`${script}`);

    // Parse fetched data
    const rawData: Array<Record<string, RawDeviceData[]>> = JSON.parse(fetchedData)["SPBluetoothDataType"];

    // Extract useful data for further processing
    const untypedConnectedDevices: RawDeviceData[] = rawData.flatMap((controller) =>
      controller["device_connected"] ? controller["device_connected"] : []
    );
    const untypedDisconnectedDevices: RawDeviceData[] = rawData.flatMap((controller) =>
      controller["device_not_connected"] ? controller["device_not_connected"] : []
    );

    // Inject connection status
    untypedConnectedDevices.forEach((device) => this._injectConnectionStatus(device, true));
    untypedDisconnectedDevices.forEach((device) => this._injectConnectionStatus(device, false));

    // Inject additional battery data from 'ioreg'
    untypedConnectedDevices.forEach((device) => this._injectIoRegBatteryLevel(device));

    // Merge all devices into one array
    return [...untypedConnectedDevices, ...untypedDisconnectedDevices];
  }

  private _injectConnectionStatus(device: RawDeviceData, isConnected: boolean) {
    const deviceName = Object.keys(device)[0];
    device[deviceName]["device_connected"] = isConnected ? "true" : "false";
  }

  private _injectIoRegBatteryLevel(device: RawDeviceData) {
    const deviceName = Object.keys(device)[0];
    const deviceMacAddress = device[deviceName]["device_address"].replaceAll(":", "-").toLowerCase();

    if (device[deviceName]["device_batteryLevelMain"]) {
      return;
    }

    let scriptOutput = "";
    try {
      scriptOutput = execSync(
        "ioreg -c AppleDeviceManagementHIDEventService | grep -e BatteryPercent -e DeviceAddress",
        { env: { ...process.env, PATH: `${process.env.PATH}:/usr/bin:/usr/sbin:` } }
      ).toString();
    } catch {
      return;
    }

    const addressBatteryPair = scriptOutput
      .split("\n") // Split into lines
      .filter((line) => line.length > 0) // Remove empty lines
      .map((line) => line.replace(/[\s|]+/gim, "")) // Remove tree artifacts
      .filter((line) => /(DeviceAddress)|(BatteryPercent)/.test(line)) // Remove useless fields
      .map((line) => line.replace(/["\s]/gim, "")) // Remove quotation marks
      .map((line) => line.split("=")); // Split into pairs;

    // Skip over devices that don't have battery levels
    for (let i = 0; i < addressBatteryPair.length - 1; i++) {
      if (addressBatteryPair[i][0] === "DeviceAddress" && addressBatteryPair[i][1] === deviceMacAddress) {
        if (addressBatteryPair[i + 1][0] === "BatteryPercent") {
          const batteryLevel = addressBatteryPair[i + 1][1];
          if (batteryLevel !== undefined) {
            device[deviceName]["device_batteryLevelMain"] = `${batteryLevel}%`;
          }
        } else {
          return;
        }
      }
    }
  }

  private _mapDevice(deviceData: RawDeviceData): Device {
    // Initialize device object
    const device = mapDevice(deviceData);

    // Modify icon path to reflect connection state
    // Not nice but the cleanest solution until a better solution
    // comes to mind :(
    if (device.connected) {
      const originalIconPath = device.icon.source.toString();
      const lastSlashIndex = originalIconPath.lastIndexOf("/");
      device.icon.source =
        originalIconPath.substring(0, lastSlashIndex) + "/connected/" + originalIconPath.substring(lastSlashIndex + 1);
    }

    return device;
  }

  private _getPath(path: string): string {
    if (__dirname.endsWith("/tools")) {
      return `../${path}`;
    }
    return path;
  }
}
