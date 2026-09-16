import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { DeviceControlsView } from "./components/DeviceControlsView";
import { EmptyView } from "./components/EmptyView";
import { getDeviceCommands } from "./devices/commands";
import { useDevices } from "./hooks/useDevices";
import { getBatteryColor, getDeviceIcon } from "./utils/device-ui";
import { formatBatteryLevel } from "./utils/formatters";

export default function ControlDeviceCommand() {
  const { data = [], error, isLoading, revalidate } = useDevices();
  const devices = data.filter((device) => device.online && getDeviceCommands(device).length > 0);
  const refresh = () => void revalidate();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search controllable devices...">
      {devices.map((device) => (
        <List.Item
          key={device.serialNumber}
          icon={getDeviceIcon(device.profile.category)}
          title={device.name}
          subtitle={device.profile.displayName}
          accessories={
            device.batteryLevel === undefined
              ? []
              : [
                  {
                    tag: {
                      value: formatBatteryLevel(device.batteryLevel),
                      color: getBatteryColor(device.batteryLevel),
                    },
                  },
                ]
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Control…"
                icon={Icon.Gear}
                target={<DeviceControlsView device={device} onSuccess={refresh} />}
              />
            </ActionPanel>
          }
        />
      ))}
      {devices.length === 0 && data.length > 0 && !error ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="No Controllable Devices"
          description="No online device has a verified public control profile. Monitoring and raw readings remain available in the EcoFlow Dashboard."
          actions={
            <ActionPanel>
              <Action title="Refresh Devices" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ) : (
        devices.length === 0 && <EmptyView isLoading={isLoading} error={error} onRetry={refresh} />
      )}
    </List>
  );
}
