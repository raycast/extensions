import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { runAppleScriptSync } from "run-applescript";
import { Image, Icon } from "@raycast/api";

export type RawDeviceData = Record<string, Record<string, string>>;
export type DeviceBatteryLevels = {
  avg: number | undefined;
  main: string | undefined;
  case: string | undefined;
  left: string | undefined;
  right: string | undefined;
};

export interface Device {
  time: number;
  name: string;
  type: string | undefined;
  icon?: Image;
  macAddress: string;
  batteryLevels: DeviceBatteryLevels;
  rawDeviceData: object;
}

const calcAvg = (arr: (string | number)[]): number => {
  const filtered = arr.filter((el) => el !== undefined);
  const toNum = filtered.map((el) => {
    if (typeof el === "string") {
      return Number(el.replace("%", "")) / 100;
    }
  });

  const cleared = toNum.reduce((acc: number, el) => {
    if (el !== undefined) {
      return acc + el;
    }
    return acc;
  }, 0);

  const avg = cleared / toNum.length;
  return avg;
};

const _attachToDevice = (deviceData: RawDeviceData): Device => {
  const deviceName = Object.keys(deviceData)[0];
  const deviceProperties = deviceData[deviceName];
  const deviceType = deviceProperties["device_minorType"];
  const deviceMacAddress = deviceProperties["device_address"];

  const deviceBatteryLevels: DeviceBatteryLevels = {
    avg: calcAvg([
      deviceProperties["device_batteryLevelMain"],
      deviceProperties["device_batteryLevelCase"],
      deviceProperties["device_batteryLevelLeft"],
      deviceProperties["device_batteryLevelRight"],
    ]),
    main: deviceProperties["device_batteryLevelMain"],
    case: deviceProperties["device_batteryLevelCase"],
    left: deviceProperties["device_batteryLevelLeft"],
    right: deviceProperties["device_batteryLevelRight"],
  };

  let deviceIconPath = undefined;
  switch (deviceType) {
    case "Keyboard":
      deviceIconPath = Icon.Keyboard;
      break;
    case "Mouse":
      deviceIconPath = Icon.Mouse;
      break;
    case "Headphones":
      deviceIconPath = Icon.Headphones;
      break;
    case "Speaker":
      deviceIconPath = Icon.Megaphone;
      break;
    case "Gamepad":
      deviceIconPath = Icon.GameController;
      break;
    default:
      deviceIconPath = Icon.Bluetooth;
      break;
  }
  return {
    time: Date.now(),
    name: deviceName,
    macAddress: deviceMacAddress,
    icon: { source: deviceIconPath },
    type: deviceType,
    batteryLevels: deviceBatteryLevels,
    rawDeviceData: deviceProperties,
  };
};

const _mapDevice = (deviceData: RawDeviceData): Device => {
  // Initialize device object
  const device = _attachToDevice(deviceData);
  return device;
};

const _injectConnectionStatus = (device: RawDeviceData, isConnected: boolean) => {
  const deviceName = Object.keys(device)[0];
  device[deviceName]["device_connected"] = isConnected ? "true" : "false";
};

const _injectIoRegBatteryLevel = (device: RawDeviceData) => {
  const deviceName = Object.keys(device)[0];
  const deviceMacAddress = device[deviceName]["device_address"].replaceAll(":", "-").toLowerCase();

  if (device[deviceName]["device_batteryLevelMain"]) {
    return;
  }

  let scriptOutput = "";
  try {
    scriptOutput = execSync("ioreg -c AppleDeviceManagementHIDEventService | grep -e BatteryPercent -e DeviceAddress", {
      env: { ...process.env, PATH: `${process.env.PATH}:/usr/bin:/usr/sbin:` },
    }).toString();
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
};

export async function getBluetoothDevices(): Promise<Device[]> {
  const script = readFileSync(resolve(__dirname, "assets/scripts/getAllDevices.applescript")).toString();
  const fetchedData = runAppleScriptSync(`${script}`);
  const rawData: Array<Record<string, RawDeviceData[]>> = JSON.parse(fetchedData)["SPBluetoothDataType"];

  const devices: RawDeviceData[] = rawData.flatMap((controller) =>
    controller["device_connected"] ? controller["device_connected"] : [],
  );

  devices.forEach((device) => _injectConnectionStatus(device, true));

  // Inject additional battery data from 'ioreg'
  devices.forEach((device) => _injectIoRegBatteryLevel(device));

  // Merge all devices into one array
  const devicesData = [...devices];
  const mappedDevices = devicesData.map((deviceData) => _mapDevice(deviceData));

  const devicesWithBatteryLevels = mappedDevices.filter(
    (device) =>
      device.batteryLevels.main !== undefined ||
      device.batteryLevels.case !== undefined ||
      device.batteryLevels.left !== undefined ||
      device.batteryLevels.right !== undefined,
  );
  return devicesWithBatteryLevels;
}
