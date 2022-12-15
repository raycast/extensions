import { Color } from "@raycast/api";
import { Device, RawDeviceData } from "src/types";

function populate(device: Device, deviceData: RawDeviceData) {
  // Extract properties for easier access
  const deviceProperties = deviceData[device.name];

  // Populate icon and model
  switch (device.productId) {
    case SonyProducts.Models.WH1000XM3:
    case SonyProducts.Models.WH1000XM4:
      // device.icon = { source: "icons/devices/apple/airpods.svg" };
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

const SonyProducts = {
  Models: {
    WH1000XM4: "0x0D58",
    WH1000XM3: "0x0CD3",
  },
  populate,
};

export default SonyProducts;
