import { Color } from "@raycast/api";
import { Device, RawDeviceData } from "src/types";

function populate(device: Device, deviceData: RawDeviceData) {
  // Extract properties for easier access
  const deviceProperties = deviceData[device.name];

  // Prepare structure for accessories battery icons
  const batteryIcons: { main: string; case: string; left: string; right: string } = {
    main: "",
    case: "",
    left: "",
    right: "",
  };

  // Populate icon and model
  switch (device.productId) {
    case Airpods.Models[1]:
    case Airpods.Models[2]:
      device.icon = { source: "icons/devices/apple/airpods.svg" };
      batteryIcons.case = "icons/devices/apple/extra/airpods.case.svg";
      batteryIcons.left = "icons/devices/apple/extra/airpods.left.svg";
      batteryIcons.right = "icons/devices/apple/extra/airpods.right.svg";
      break;
    case Airpods.Models[3]:
      device.icon = { source: "icons/devices/apple/airpods.gen3.svg" };
      batteryIcons.case = "icons/devices/apple/extra/airpods.gen3.case.svg";
      batteryIcons.left = "icons/devices/apple/extra/airpods.gen3.left.svg";
      batteryIcons.right = "icons/devices/apple/extra/airpods.gen3.right.svg";
      break;
    case Airpods.Models.Pro:
    case Airpods.Models.Pro2:
      device.icon = { source: "icons/devices/apple/airpods.pro.svg" };
      batteryIcons.case = "icons/devices/apple/extra/airpods.pro.case.svg";
      batteryIcons.left = "icons/devices/apple/extra/airpods.pro.left.svg";
      batteryIcons.right = "icons/devices/apple/extra/airpods.pro.right.svg";
      break;
    case Airpods.Models.Max:
      device.icon = { source: "icons/devices/apple/airpods.max.svg" };
      batteryIcons.main = "icons/bolt.svg";
      break;
  }

  // Populate accessories
  if (device.connected) {
    const mainBatteryLevel = deviceProperties["device_batteryLevelMain"];
    const caseBatteryLevel = deviceProperties["device_batteryLevelCase"];
    const leftAirpodBatteryLevel = deviceProperties["device_batteryLevelLeft"];
    const rightAirpodBatteryLevel = deviceProperties["device_batteryLevelRight"];
    if (mainBatteryLevel) {
      device.accessories.push({
        text: mainBatteryLevel,
        icon: { source: batteryIcons.main, tintColor: Color.PrimaryText },
      });
    }
    if (caseBatteryLevel) {
      device.accessories.push({
        text: caseBatteryLevel,
        icon: { source: batteryIcons.case, tintColor: Color.PrimaryText },
      });
    }
    if (leftAirpodBatteryLevel) {
      device.accessories.push({
        text: leftAirpodBatteryLevel,
        icon: { source: batteryIcons.left, tintColor: Color.PrimaryText },
      });
    }
    if (rightAirpodBatteryLevel) {
      device.accessories.push({
        text: rightAirpodBatteryLevel,
        icon: { source: batteryIcons.right, tintColor: Color.PrimaryText },
      });
    }
  }

  // Return populated device
  return device;
}

const Airpods = {
  Models: {
    1: "0x2002",
    2: "0x200F",
    3: "0x2013",
    Pro: "0x200E",
    Pro2: "0x2014",
    Max: "0x200A",
  },
  populate,
};

export default Airpods;
