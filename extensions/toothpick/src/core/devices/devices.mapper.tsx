import { Device } from "./devices.model";
import { DeviceBatteryLevels, RawDeviceData } from "./devices.types";

export function mapDevice(deviceData: RawDeviceData): Device {
  // Extract useful data
  const deviceName = Object.keys(deviceData)[0];
  const deviceProperties = deviceData[deviceName];
  const deviceType = deviceProperties["device_minorType"];
  const deviceMacAddress = deviceProperties["device_address"];
  const deviceVendorId = deviceProperties["device_vendorID"];
  const deviceProductId = deviceProperties["device_productID"];
  const deviceConnected = deviceProperties["device_connected"] === "true";
  const deviceBatteryLevels: DeviceBatteryLevels = {
    main: deviceProperties["device_batteryLevelMain"],
    case: deviceProperties["device_batteryLevelCase"],
    left: deviceProperties["device_batteryLevelLeft"],
    right: deviceProperties["device_batteryLevelRight"],
  };

  // Get generic device icon path
  let deviceIconPath = undefined;
  switch (deviceType) {
    case "Keyboard":
      deviceIconPath = "icons/devices/generic/keyboard.svg";
      break;
    case "Mouse":
      deviceIconPath = "icons/devices/generic/mouse.svg";
      break;
    case "Headphones":
      deviceIconPath = "icons/devices/generic/headphones.svg";
      break;
    case "Speaker":
      deviceIconPath = "icons/devices/generic/speaker.svg";
      break;
    case "Gamepad":
      deviceIconPath = "icons/devices/generic/gamepad.svg";
      break;
    default:
      deviceIconPath = "icons/devices/generic/bluetooth.svg";
      break;
  }

  return new Device({
    name: deviceName,
    icon: { source: deviceIconPath },
    type: deviceType,
    macAddress: deviceMacAddress,
    connected: deviceConnected,
    batteryLevels: deviceBatteryLevels,
    productId: deviceProductId,
    vendorId: deviceVendorId,
    actions: [],
    accessories: [],
    rawDeviceData: deviceProperties,
  });
}
