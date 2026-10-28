import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { getDeviceCommands } from "../devices/commands";
import type { DeviceSnapshot } from "../types/device";
import { DeviceControlsView } from "./DeviceControlsView";
import { RawReadingsView } from "./RawReadingsView";

export function DeviceActionPanel({
  device,
  onRefresh,
}: {
  device: DeviceSnapshot;
  onRefresh: (() => void) | undefined;
}) {
  const commands = getDeviceCommands(device);
  const hasReadings = Object.keys(device.quotas).length > 0;

  return (
    <ActionPanel>
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
      {onRefresh && (
        <Action
          title="Refresh Devices"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      )}
      {device.profile.documentationUrl && (
        <Action.OpenInBrowser
          title="Open EcoFlow Documentation"
          icon={Icon.Book}
          url={device.profile.documentationUrl}
        />
      )}
      <Action.CopyToClipboard title="Copy Serial Number" icon={Icon.CopyClipboard} content={device.serialNumber} />
    </ActionPanel>
  );
}
