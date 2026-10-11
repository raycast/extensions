import { Icon, Keyboard, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences } from "@raycast/api";
import { getDeviceCategory } from "./devices/catalog";
import { useDevices } from "./hooks/useDevices";
import type { DeviceSnapshot } from "./types/device";
import { formatBatteryLevel, formatWatts } from "./utils/formatters";

export default function EcoFlowMenuBarCommand() {
  const { data = [], error, isLoading, revalidate } = useDevices();
  const online = data.filter((device) => device.online);
  const batteryDevices = online.filter(
    (device): device is DeviceSnapshot & { batteryLevel: number } => device.batteryLevel !== undefined,
  );
  const lowestBattery = batteryDevices.reduce<number | undefined>(
    (lowest, device) => (lowest === undefined ? device.batteryLevel : Math.min(lowest, device.batteryLevel)),
    undefined,
  );
  const title = lowestBattery === undefined ? undefined : formatBatteryLevel(lowestBattery);

  return (
    <MenuBarExtra
      icon={{ source: "extension-icon-v2.png" }}
      {...(title ? { title } : {})}
      tooltip={error ? `EcoFlow: ${error.message}` : menuBarTooltip(online)}
      isLoading={isLoading}
    >
      {online.length > 0 && (
        <MenuBarExtra.Section title={`Online Devices · ${online.length}`}>
          {online.map((device) => (
            <MenuBarExtra.Item
              key={device.serialNumber}
              title={device.name}
              subtitle={deviceSubtitle(device)}
              icon={{ source: getDeviceCategory(device.profile.category).emoji }}
              onAction={() => openDevice(device.serialNumber)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {data.some((device) => !device.online) && (
        <MenuBarExtra.Section title={`Offline Devices · ${data.filter((device) => !device.online).length}`}>
          {data
            .filter((device) => !device.online)
            .map((device) => (
              <MenuBarExtra.Item
                key={device.serialNumber}
                title={device.name}
                subtitle={device.profile.displayName}
                icon={{ source: getDeviceCategory(device.profile.category).emoji }}
                onAction={() => openDevice(device.serialNumber)}
              />
            ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {error && (
          <MenuBarExtra.Item title="Could Not Refresh EcoFlow" subtitle={error.message} icon={Icon.ExclamationMark} />
        )}
        <MenuBarExtra.Item title="Open EcoFlow Dashboard" icon={Icon.AppWindow} onAction={openDashboard} />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => void revalidate()}
        />
        <MenuBarExtra.Item title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function deviceSubtitle(device: DeviceSnapshot): string {
  const parts = [
    device.batteryLevel === undefined ? undefined : formatBatteryLevel(device.batteryLevel),
    device.inputWatts === undefined ? undefined : `${formatWatts(device.inputWatts)} in`,
    device.outputWatts === undefined ? undefined : `${formatWatts(device.outputWatts)} out`,
    device.batteryWatts === undefined ? undefined : `${formatWatts(device.batteryWatts)} battery`,
  ].filter(Boolean);
  return parts.join(" · ") || device.profile.displayName;
}

function menuBarTooltip(devices: DeviceSnapshot[]): string {
  if (devices.length === 0) return "EcoFlow: no online devices";
  if (devices.length === 1 && devices[0]) return `EcoFlow: ${devices[0].name} is online`;
  return `EcoFlow: ${devices.length} devices online`;
}

function openDashboard(): void {
  void launchCommand({ name: "list-devices", type: LaunchType.UserInitiated });
}

function openDevice(serialNumber: string): void {
  void launchCommand({
    name: "device-detail",
    type: LaunchType.UserInitiated,
    arguments: { device: serialNumber },
  });
}
