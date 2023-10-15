import { Color } from "@raycast/api";
import { Device, RawDeviceData } from "../../../types";

function populate(device: Device, deviceData: RawDeviceData) {
  // Extract properties for easier access
  const deviceProperties = deviceData[device.name];

  // Populate accessories
  if (device.connected) {
    const mainBatteryLevel = deviceProperties["device_batteryLevelMain"];
    if (mainBatteryLevel) {
      device.accessories.push({
        text: mainBatteryLevel,
        icon: { source: "icons/bolt.svg", tintColor: Color.PrimaryText },
      });
    }
  }

  // Return populated device
  return device;
}

const MagicKeyboard = {
  Models: {
    Standard: "0x0267",
    Numpad: "0x026C",
    Standard2021: "0x029C",
    Numpad2021: "0x029F",
    Fingerprint2021: "0x029A",
  },
  populate,
};

export default MagicKeyboard;
