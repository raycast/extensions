import { MenuBarExtra, Icon, Color, showHUD, openExtensionPreferences } from "@raycast/api";
import { useMirAIe } from "./hooks/useMiraie";
import { Device, PowerMode, HVACMode, SwingMode } from "./lib/miraie";
import { MAX_TEMPERATURE, MIN_TEMPERATURE, SWING_MODE_LABELS } from "./lib/miraie/constants";

export default function Command() {
  const { devices, isLoading, refreshDevices, isConnected, error } = useMirAIe();

  const formatModeLabel = (mode: HVACMode | undefined) => {
    if (!mode) {
      return "Unknown";
    }

    return mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
  };

  const getSwingLabel = (mode: SwingMode | undefined, direction: "vertical" | "horizontal") => {
    if (mode === undefined) {
      return "Unknown";
    }

    return SWING_MODE_LABELS[direction][mode] ?? "Unknown";
  };

  const getPowerIcon = (device: Device) => {
    if (!device.status?.isOnline) return { source: Icon.WifiDisabled, color: Color.SecondaryText };
    return device.status?.powerMode === PowerMode.ON
      ? { source: Icon.Power, color: Color.Green }
      : { source: Icon.Power, color: Color.Red };
  };

  const getStatusTitle = () => {
    if (error && devices.length === 0) return "Credentials Missing";
    if (isLoading && devices.length === 0) return "Loading...";
    if (devices.length === 0) return "No Devices";

    const onDevices = devices.filter((d) => d.status?.isOnline && d.status?.powerMode === PowerMode.ON);
    if (onDevices.length === 0) return "";
    if (onDevices.length === 1) return `${onDevices[0].status.temperature}°C`;
    return `${onDevices.length} ACs On`;
  };

  return (
    <MenuBarExtra
      icon={{ source: "extension_icon.png" }}
      title={getStatusTitle()}
      isLoading={isLoading && devices.length === 0}
    >
      {error && (
        <MenuBarExtra.Section title="Account Error">
          <MenuBarExtra.Item
            title={error}
            icon={{ source: Icon.ExclamationMark }}
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
      )}

      {devices.map((device) => (
        <MenuBarExtra.Section key={device.id} title={`${device.friendlyName} ${device.space.spaceName}`}>
          {(() => {
            const canControl = isConnected && device.status?.isOnline;

            return (
              <>
                <MenuBarExtra.Item
                  title={
                    !isConnected
                      ? "Waiting for MirAIe Connection"
                      : !device.status?.isOnline
                        ? "Device Offline"
                        : device.status?.powerMode === PowerMode.ON
                          ? "Turn Off"
                          : "Turn On"
                  }
                  icon={getPowerIcon(device)}
                  onAction={async () => {
                    if (!isConnected) {
                      await showHUD("Still connecting to MirAIe");
                      return;
                    }

                    if (!device.status?.isOnline) {
                      await showHUD(`${device.friendlyName} is offline`);
                      return;
                    }

                    if (device.status?.powerMode === PowerMode.ON) {
                      await device.turnOff();
                      await showHUD(`Turning off ${device.friendlyName}`);
                    } else {
                      await device.turnOn();
                      await showHUD(`Turning on ${device.friendlyName}`);
                    }
                  }}
                />

                {canControl && device.status?.powerMode === PowerMode.ON && (
                  <>
                    <MenuBarExtra.Submenu title={`Temp: ${device.status?.temperature}°C`} icon={Icon.Temperature}>
                      <MenuBarExtra.Item
                        title="+1°C"
                        onAction={async () => {
                          const newTemp = Math.min(device.status.temperature + 1, MAX_TEMPERATURE);
                          await device.setTemperature(newTemp);
                          await showHUD(`${device.friendlyName}: ${newTemp}°C`);
                        }}
                      />
                      <MenuBarExtra.Item
                        title="-1°C"
                        onAction={async () => {
                          const newTemp = Math.max(device.status.temperature - 1, MIN_TEMPERATURE);
                          await device.setTemperature(newTemp);
                          await showHUD(`${device.friendlyName}: ${newTemp}°C`);
                        }}
                      />
                      <MenuBarExtra.Section title="Presets">
                        {[16, 18, 20, 22, 24, 26, 28].map((temp) => (
                          <MenuBarExtra.Item
                            key={temp}
                            title={`${temp}°C`}
                            onAction={async () => {
                              await device.setTemperature(temp);
                              await showHUD(`Setting ${device.friendlyName} to ${temp}°C`);
                            }}
                          />
                        ))}
                      </MenuBarExtra.Section>
                    </MenuBarExtra.Submenu>

                    <MenuBarExtra.Submenu
                      title={`Mode: ${formatModeLabel(device.status?.hvacMode)}`}
                      icon={Icon.Circle}
                    >
                      {Object.values(HVACMode).map((mode) => (
                        <MenuBarExtra.Item
                          key={mode}
                          title={formatModeLabel(mode)}
                          onAction={async () => {
                            await device.setHvacMode(mode);
                            await showHUD(`Setting ${device.friendlyName} to ${formatModeLabel(mode)}`);
                          }}
                        />
                      ))}
                    </MenuBarExtra.Submenu>

                    <MenuBarExtra.Submenu
                      title={`Vertical Swing: ${getSwingLabel(device.status?.vSwingMode, "vertical")}`}
                      icon={Icon.ChevronUpDown}
                    >
                      {(Object.entries(SWING_MODE_LABELS.vertical) as [string, string][]).map(([mode, label]) => (
                        <MenuBarExtra.Item
                          key={mode}
                          title={label}
                          onAction={async () => {
                            await device.setVSwingMode(Number(mode) as SwingMode);
                            await showHUD(`${device.friendlyName}: Vertical Swing set to ${label}`);
                          }}
                        />
                      ))}
                    </MenuBarExtra.Submenu>

                    <MenuBarExtra.Submenu
                      title={`Horizontal Swing: ${getSwingLabel(device.status?.hSwingMode, "horizontal")}`}
                      icon={Icon.Code}
                    >
                      {(Object.entries(SWING_MODE_LABELS.horizontal) as [string, string][]).map(([mode, label]) => (
                        <MenuBarExtra.Item
                          key={mode}
                          title={label}
                          onAction={async () => {
                            await device.setHSwingMode(Number(mode) as SwingMode);
                            await showHUD(`${device.friendlyName}: Horizontal Swing set to ${label}`);
                          }}
                        />
                      ))}
                    </MenuBarExtra.Submenu>
                  </>
                )}
              </>
            );
          })()}
        </MenuBarExtra.Section>
      ))}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" icon={Icon.Repeat} onAction={() => refreshDevices(true)} />
        <MenuBarExtra.Item
          title="Scan for New Devices"
          icon={Icon.Hammer}
          onAction={() => refreshDevices(true, true)}
        />
        <MenuBarExtra.Item title="Settings..." icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
