import { Action, Clipboard, Color, Icon } from "@raycast/api";
import { connectDevice, disconnectDevice } from "src/helpers/device-actions";
import { Device, RawDeviceData } from "../../types";

export default function mapGenericDevice(deviceData: RawDeviceData): Device {
  // Extract useful data
  const deviceName = Object.keys(deviceData)[0];
  const deviceProperties = deviceData[deviceName];
  const deviceModel = deviceProperties["device_minorType"];
  const deviceMacAddress = deviceProperties["device_address"];
  const deviceVendorId = deviceProperties["device_vendorID"];
  const deviceProductId = deviceProperties["device_productID"];
  const deviceConnected = deviceProperties["device_connected"] === "true";

  // Get device icon path
  let deviceIconPath = undefined;
  switch (deviceModel) {
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

  return {
    name: deviceName,
    icon: { source: deviceIconPath },
    model: deviceModel,
    accessories: [],
    macAddress: deviceMacAddress,
    connected: deviceConnected,
    productId: deviceProductId,
    vendorId: deviceVendorId,
    actions: [
      deviceConnected ? (
        <Action
          title="Disconnect"
          key="disconnect-action"
          onAction={() => disconnectDevice(deviceMacAddress)}
          icon={{ source: "icons/disconnect.svg", tintColor: Color.PrimaryText }}
        />
      ) : (
        <Action
          title="Connect"
          key="connect-action"
          onAction={() => connectDevice(deviceMacAddress)}
          icon={{ source: "icons/connect.svg", tintColor: Color.PrimaryText }}
        />
      ),
      <Action
        title={`Copy Mac Address: ${deviceMacAddress}`}
        key="copy-mac-address"
        onAction={() => Clipboard.copy(deviceMacAddress)}
        icon={Icon.Hammer}
      />,
      <Action
        title={`Copy Device Data`}
        key="copy-device-data"
        onAction={() => Clipboard.copy(JSON.stringify(deviceData))}
        icon={Icon.ComputerChip}
      />,
    ],
  };
}
