import { List, Icon, Color } from "@raycast/api";
import type { Device } from "../shared";
import CopyActions from "./CopyActions";
import { getDeviceListIcon } from "./deviceListIcon";

export default function DeviceItem({ device, showLoginName = true }: { device: Device; showLoginName?: boolean }) {
  return (
    <List.Item
      title={device.name}
      subtitle={[device.ipv4, device.os].filter(Boolean).join("   ")}
      key={device.key}
      icon={getDeviceListIcon(device.online)}
      accessories={[
        ...(device.ssh ? [{ tag: { value: "SSH", color: Color.Green } }] : []),
        ...(device.self ? [{ text: "This device", icon: Icon.Person }] : []),
        ...(showLoginName && device.loginName ? [{ text: device.loginName }] : []),
        { text: device.online ? `Connected` : "Last seen " + formatDate(device.lastseen) },
      ]}
      actions={<CopyActions device={device} />}
    />
  );
}

function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
