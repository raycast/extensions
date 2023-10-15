import { Color } from "@raycast/api";
import { Device, RawDeviceData } from "../../../types";

function populate(device: Device, deviceData: RawDeviceData) {
  // Extract properties for easier access
  const deviceProperties = deviceData[device.name];

  // Populate icon and model
  switch (device.productId) {
    case MagicTrackpad.Models[1]:
      device.icon = { source: "icons/devices/apple/magic-trackpad.svg" };
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

const MagicTrackpad = {
  Models: {
    1: "0x030E",
    2: "0x0265",
  },
  populate,
};

export default MagicTrackpad;
