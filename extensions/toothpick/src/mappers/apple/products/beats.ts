import { Color } from "@raycast/api";
import { Device, RawDeviceData } from "src/types";

function populate(device: Device, deviceData: RawDeviceData) {
  // Extract properties for easier access
  const deviceProperties = deviceData[device.name];

  // Prepare structure for accessories battery icons
  const batteryIcons: { main: string; case: string; left: string; right: string } = {
    main: "icons/bolt.svg",
    case: "",
    left: "",
    right: "",
  };

  // Populate icon and model
  switch (device.productId) {
    case Beats.Models.X:
    case Beats.Models.Flex:
      device.icon = { source: "icons/devices/apple/beats.earphones.svg" };
      break;
    case Beats.Models.Solo3:
    case Beats.Models.SoloPro:
    case Beats.Models.Studio3:
      device.icon = { source: "icons/devices/apple/beats.headphones.svg" };
      break;
    case Beats.Models.FitPro:
      device.icon = { source: "icons/devices/apple/beats.fit.pro.svg" };
      batteryIcons.case = "icons/devices/apple/extra/beats.fit.pro.case.svg";
      batteryIcons.left = "icons/devices/apple/extra/beats.fit.pro.left.svg";
      batteryIcons.right = "icons/devices/apple/extra/beats.fit.pro.right.svg";
      break;
    case Beats.Models.Powerbeats:
      device.icon = { source: "icons/devices/apple/beats.powerbeats.svg" };
      break;
    case Beats.Models.Powerbeats3:
      device.icon = { source: "icons/devices/apple/beats.powerbeats.3.svg" };
      break;
    case Beats.Models.PowerbeatsPro:
      device.icon = { source: "icons/devices/apple/beats.powerbeats.pro.svg" };
      batteryIcons.case = "icons/devices/apple/extra/beats.powerbeats.pro.case.svg";
      batteryIcons.left = "icons/devices/apple/extra/beats.powerbeats.pro.left.svg";
      batteryIcons.right = "icons/devices/apple/extra/beats.powerbeats.pro.right.svg";
      break;
    case Beats.Models.StudioBuds:
      device.icon = { source: "icons/devices/apple/beats.studio.buds.svg" };
      batteryIcons.case = "icons/devices/apple/extra/beats.studio.buds.case.svg";
      batteryIcons.left = "icons/devices/apple/extra/beats.studio.buds.left.svg";
      batteryIcons.right = "icons/devices/apple/extra/beats.studio.buds.right.svg";
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

const Beats = {
  Models: {
    // Need more data
    X: "???", // TODO
    Flex: "0x2010",
    Solo3: "???", // TODO
    SoloPro: "0x200C",
    FitPro: "0x2012",
    Powerbeats: "???", // TODO
    Powerbeats3: "???", // TODO
    PowerbeatsPro: "???", // TODO
    Studio3: "???", // TODO
    StudioBuds: "0x2011",
  },
  populate,
};

export default Beats;
