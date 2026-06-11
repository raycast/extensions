import { Action, ActionPanel, Color, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { PowerMode } from "./lib/miraie";
import { useMirAIe } from "./hooks/useMiraie";
import ControlDevice from "./control-device";

export default function ListDevices() {
  const { devices, isLoading, error, refreshDevices, isConnected } = useMirAIe();

  if (error) {
    return (
      <Detail
        markdown={`# Connection Error\n\n${error}\n\nPlease check your credentials in Raycast preferences.`}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (!devices.length) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={{ source: Icon.Devices, tintColor: Color.Red }}
          title="There are no connected devices"
          description="We could not find any connected devices, please make sure your devices are connected."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      {devices.map((device) => {
        const isOnline = device.status.isOnline;
        const canControl = isOnline && isConnected;
        const isPoweredOn = device.status.powerMode === PowerMode.ON;

        return (
          <List.Item
            key={device.id}
            icon={{
              source: Icon.Devices,
              tintColor: isOnline ? Color.Green : Color.Red,
            }}
            title={device.friendlyName}
            subtitle={device.space.spaceName}
            accessories={[
              {
                text: isPoweredOn ? "ON" : "OFF",
                icon: { source: Icon.Power, tintColor: isPoweredOn ? Color.Green : Color.Red },
                tooltip: isOnline
                  ? "Device is powered " + (isPoweredOn ? "on" : "off")
                  : "Device offline - cannot control",
              },
              ...(isPoweredOn
                ? [
                    {
                      tag: {
                        value: device.status.hvacMode,
                        color: Color.Blue,
                      },
                    },
                    { text: `${device.status.temperature}°C`, icon: Icon.Temperature },
                  ]
                : [
                    {
                      text: isOnline ? "Online" : "Offline",
                      icon: {
                        source: isOnline ? Icon.Wifi : Icon.WifiDisabled,
                        tintColor: isOnline ? Color.Green : Color.Red,
                      },
                    },
                  ]),
            ]}
            actions={
              <ActionPanel>
                {canControl ? (
                  <>
                    <Action.Push
                      title="Control Device"
                      target={<ControlDevice device={device} onRefresh={() => refreshDevices(true)} />}
                      icon={Icon.Gear}
                    />
                    <Action
                      title="Toggle Power"
                      icon={Icon.Power}
                      onAction={async () => {
                        if (device.status.powerMode === PowerMode.ON) {
                          await device.turnOff();
                        } else {
                          await device.turnOn();
                        }
                      }}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.Repeat}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => refreshDevices(true)}
                    />
                    <Action
                      title="Scan for New Devices"
                      icon={Icon.Hammer}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      onAction={() => refreshDevices(true, true)}
                    />
                  </>
                ) : (
                  <>
                    <Action
                      title={isConnected ? "Refresh" : "Waiting for Connection"}
                      icon={isConnected ? Icon.ArrowClockwise : Icon.Clock}
                      onAction={refreshDevices}
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
