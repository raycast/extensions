import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { getDeviceCommands } from "../devices/commands";
import type { DeviceSnapshot } from "../types/device";
import { deviceSearchText, getBatteryColor, getDeviceIcon, powerFlowIcon } from "../utils/device-ui";
import { formatBatteryLevel, formatWatts } from "../utils/formatters";
import { DeviceControlsView } from "./DeviceControlsView";
import { DeviceDetailPanel } from "./DeviceDetailPanel";
import { DeviceDetailView } from "./DeviceDetailView";
import { RawReadingsView } from "./RawReadingsView";

export function DeviceListItem({ device, onRefresh }: { device: DeviceSnapshot; onRefresh(): void }) {
  const accessories: List.Item.Accessory[] = [];
  const commands = getDeviceCommands(device);
  const hasReadings = Object.keys(device.quotas).length > 0;

  if (device.batteryLevel !== undefined) {
    accessories.push({
      tag: { value: formatBatteryLevel(device.batteryLevel), color: getBatteryColor(device.batteryLevel) },
    });
  } else if (device.switchEnabled !== undefined) {
    accessories.push({
      tag: {
        value: device.switchEnabled ? "On" : "Off",
        color: device.switchEnabled ? Color.Green : Color.SecondaryText,
      },
    });
  }

  if (device.inputWatts !== undefined && device.inputWatts !== 0) {
    accessories.push({ text: `${formatWatts(device.inputWatts)} in` });
  }
  if (device.outputWatts !== undefined && device.outputWatts !== 0) {
    accessories.push({ text: `${formatWatts(device.outputWatts)} out` });
  }
  if (device.powerFlow !== "unknown") {
    accessories.push({ icon: powerFlowIcon(device.powerFlow), tooltip: device.powerFlow });
  }
  accessories.push({
    icon: device.online
      ? { source: Icon.CircleFilled, tintColor: Color.Green }
      : { source: Icon.Circle, tintColor: Color.SecondaryText },
    tooltip: device.online ? "Online" : "Offline",
  });

  return (
    <List.Item
      icon={getDeviceIcon(device.profile.category)}
      title={device.name}
      subtitle={device.profile.displayName}
      keywords={[deviceSearchText(device)]}
      accessories={accessories}
      detail={<DeviceDetailPanel device={device} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Device"
            icon={Icon.AppWindowSidebarLeft}
            target={<DeviceDetailView device={device} onRefresh={onRefresh} />}
          />
          {commands.length > 0 && device.online && (
            <Action.Push
              title="Control Device…"
              icon={Icon.Gear}
              target={<DeviceControlsView device={device} onSuccess={onRefresh} />}
            />
          )}
          {hasReadings && (
            <Action.Push title="View Raw Readings" icon={Icon.Gauge} target={<RawReadingsView device={device} />} />
          )}
          <Action
            title="Refresh Devices"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          {device.profile.documentationUrl && (
            <Action.OpenInBrowser
              title="Open EcoFlow Documentation"
              icon={Icon.Book}
              url={device.profile.documentationUrl}
            />
          )}
          <Action.CopyToClipboard title="Copy Serial Number" icon={Icon.CopyClipboard} content={device.serialNumber} />
        </ActionPanel>
      }
    />
  );
}
