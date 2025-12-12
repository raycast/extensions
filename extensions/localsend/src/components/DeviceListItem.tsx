import { List, Icon, Color } from "@raycast/api";
import { LocalSendDevice } from "../types";

export function getDeviceIcon(deviceType?: string): Icon {
  switch (deviceType) {
    case "mobile":
      return Icon.Mobile;
    case "desktop":
      return Icon.ComputerChip;
    case "server":
      return Icon.HardDrive;
    case "web":
      return Icon.Globe;
    default:
      return Icon.Laptop;
  }
}

export function getProtocolTag(protocol: string) {
  return {
    value: protocol.toUpperCase(),
    color: protocol === "https" ? Color.Green : Color.Orange,
  };
}

export function DeviceListItem({ device, actions }: { device: LocalSendDevice; actions: React.ReactNode }) {
  return (
    <List.Item
      icon={getDeviceIcon(device.deviceType)}
      title={device.alias}
      subtitle={device.deviceModel}
      accessories={[
        { text: device.ip },
        { tag: getProtocolTag(device.protocol) },
        ...(device.version ? [{ text: `v${device.version}` }] : []),
      ]}
      actions={actions}
    />
  );
}
