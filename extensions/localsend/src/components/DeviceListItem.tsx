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
      return Icon.ComputerChip;
  }
}

export function getProtocolTag(protocol: string) {
  return {
    value: protocol.toUpperCase(),
    color: protocol === "https" ? Color.Green : Color.Orange,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DeviceListItem({ device, actions }: { device: LocalSendDevice; actions: any }) {
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
