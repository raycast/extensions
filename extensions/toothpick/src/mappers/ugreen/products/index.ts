import { Color } from "@raycast/api";
import { Device, RawDeviceData } from "src/types";

function populate(device: Device, deviceData: RawDeviceData) {
  // Extract properties for easier access
  const deviceProperties = deviceData[device.name];

  // Prepare structure for accessories battery icons
  const batteryIcons: { main: string } = {
    main: "",
  };

  // Populate icon and model
  switch (device.productId) {
    case UgreenProducts.Models.HiTuneX6:
      device.icon = { source: "icons/devices/ugreen/hitune.x6.svg" };
      batteryIcons.main = "icons/bolt.svg";
      break;
  }

  // Populate accessories
  if (device.connected) {
    const mainBatteryLevel = deviceProperties["device_batteryLevelMain"];
    if (mainBatteryLevel) {
      device.accessories.push({
        text: mainBatteryLevel,
        icon: { source: batteryIcons.main, tintColor: Color.PrimaryText },
      });
    }
  }

  // Return populated device
  return device;
}

const UgreenProducts = {
  Models: {
    HiTuneX6: "0x223B",
  },
  populate,
};

export default UgreenProducts;
