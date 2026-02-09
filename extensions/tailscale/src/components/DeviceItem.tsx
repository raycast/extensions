import { List, Icon } from "@raycast/api";
import type { ReactNode } from "react";
import type { Device } from "../shared";
import CopyActions from "./CopyActions";
import { getDeviceListIcon } from "./deviceListIcon";

type DeviceItemProps = {
  device: Device;
  showLoginName?: boolean;
  subtitle?: string;
  accessories?: List.Item.Accessory[];
  actions?: ReactNode;
};

export default function DeviceItem({
  device,
  showLoginName = true,
  subtitle: subtitleOverride,
  accessories: accessoriesOverride,
  actions: actionsOverride,
}: DeviceItemProps) {
  const subtitle = subtitleOverride ?? [device.ipv4, device.os].filter(Boolean).join("   ");
  const accessories =
    accessoriesOverride ??
    [
      ...(device.self ? [{ tag: "This device", icon: Icon.Person }] : []),
      ...(showLoginName && device.loginName ? [{ text: device.loginName }] : []),
      { text: device.online ? "Connected" : "Last seen " + formatDate(device.lastseen) },
    ];
  const actions = actionsOverride ?? <CopyActions device={device} />;

  return (
    <List.Item
      title={device.name}
      subtitle={subtitle}
      key={device.key}
      icon={getDeviceListIcon(device.online)}
      accessories={accessories}
      actions={actions}
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
