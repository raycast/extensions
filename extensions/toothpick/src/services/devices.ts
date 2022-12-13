import mapAppleDevice from "../mappers/apple";
import mapGenericDevice from "../mappers/generic";
import { readFileSync } from "fs";
import { runAppleScriptSync } from "run-applescript";
import { Device, RawDeviceData } from "../types";
import { resolve } from "path";
import mapSonyDevice from "src/mappers/sony";
import mapBoseDevice from "src/mappers/bose";
import mapSamsungDevice from "src/mappers/samsung";
import mapUgreenDevice from "src/mappers/ugreen";

export function getDevices(): Device[] {
  const devicesData = _fetchRawDevicesData();
  const mappedDevices = devicesData.map((deviceData) => _mapDevice(deviceData));
  return mappedDevices;
}

export function openConnection(deviceMacAddress: string) {
  const formattedMacAddress = deviceMacAddress.toUpperCase().replaceAll(":", "-");
  const script = readFileSync(resolve(__dirname, "assets/scripts/connectDevice.applescript")).toString();
  const getFirstMatchingDeviceScript = readFileSync(
    resolve(__dirname, "assets/scripts/getFirstMatchingDevice.applescript")
  ).toString();
  const result = runAppleScriptSync(
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
  if (result !== "0") throw "Failed to connect device.";
}

export function closeConnection(deviceMacAddress: string) {
  const formattedMacAddress = deviceMacAddress.toUpperCase().replaceAll(":", "-");
  const script = readFileSync(resolve(__dirname, "assets/scripts/disconnectDevice.applescript")).toString();
  const getFirstMatchingDeviceScript = readFileSync(
    resolve(__dirname, "assets/scripts/getFirstMatchingDevice.applescript")
  ).toString();
  const result = runAppleScriptSync(
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
  if (result !== "0") throw "Failed to disconnect device.";
}

function _fetchRawDevicesData(): RawDeviceData[] {
  // Fetch Bluetooth data
  const script = readFileSync(resolve(__dirname, "assets/scripts/getAllDevices.applescript")).toString();
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
  untypedConnectedDevices.forEach((device) => _injectConnectionStatus(device, true));
  untypedDisconnectedDevices.forEach((device) => _injectConnectionStatus(device, false));

  // Inject additional battery data from 'ioreg'
  untypedConnectedDevices.forEach((device) => _injectIoRegBatteryLevel(device));

  // Merge all devices into one array
  return [...untypedConnectedDevices, ...untypedDisconnectedDevices];
}

function _injectConnectionStatus(device: RawDeviceData, isConnected: boolean) {
  const deviceName = Object.keys(device)[0];
  device[deviceName]["device_connected"] = isConnected ? "true" : "false";
}

function _injectIoRegBatteryLevel(device: RawDeviceData) {
  const deviceName = Object.keys(device)[0];
  const deviceMacAddress = device[deviceName]["device_address"].replaceAll(":", "-").toLowerCase();

  if (device[deviceName]["device_batteryLevelMain"]) {
    return;
  }

  let scriptOutput = "";
  try {
    scriptOutput = runAppleScriptSync(
      `do shell script "/usr/sbin/ioreg -c AppleDeviceManagementHIDEventService | grep -e BatteryPercent -e DeviceAddress"`
    );
  } catch {
    return;
  }

  const addressBatteryPair = scriptOutput
    .split("\r")
    .filter((x) => x.match("(DeviceAddress)|(BatteryPercent)"))
    .map((x) => {
      const matches = /"([A-z]+)"[\s=]+(["\- A-z0-9]+)/.exec(x);
      if (matches) {
        return [matches[1], matches[2].replace('"', "").replace('"', "")];
      } else {
        return ["", ""];
      }
    });

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

function _mapDevice(deviceData: RawDeviceData): Device {
  // Initialize generic device object
  let device = mapGenericDevice(deviceData);

  // Map device by vendor
  switch (device.vendorId) {
    case "0x004C":
      device = mapAppleDevice(device, deviceData);
      break;
    case "0x054C":
      device = mapSonyDevice(device, deviceData);
      break;
    case "0x009E":
      device = mapBoseDevice(device);
      break;
    case "0x0075":
      device = mapSamsungDevice(device);
      break;
    case "0x005D":
      device = mapUgreenDevice(device, deviceData);
      break;
  }

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
