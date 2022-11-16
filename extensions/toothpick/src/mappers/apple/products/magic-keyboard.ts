import { Color } from "@raycast/api";
import { Device, RawDeviceData } from "../../../libs/types";

function populate(device: Device, deviceData: RawDeviceData) {
  // Extract properties for easier access
  const deviceProperties = deviceData[device.name];

  // Populate icon and model
  switch (device.productId) {
    case MagicKeyboard.Models.Unknown:
    case MagicKeyboard.Models.Standard:
    case MagicKeyboard.Models.Numpad:
    case MagicKeyboard.Models.Fingerprint:
      device.icon = { source: "icons/devices/generic/keyboard.svg" };
      break;
  }

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
    Unknown: "0x0267",
    Standard: "0x029C",
    Numpad: "0x029F",
    Fingerprint: "0x029A",
  },
  populate,
};

export default MagicKeyboard;
