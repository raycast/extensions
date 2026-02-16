import { Action, ActionPanel, Color, Icon, List, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import {
  AudioApp,
  AppStatus,
  AudioDevice,
  getAppStatus,
  getAppOutputDevice,
  getOutputDeviceIconSource,
  isFineTuneAvailable,
  isFineTuneEnabled,
  isCommunicationApp,
  removeAppOutputDevice,
  setAppOutputDevice,
  setAppVolume,
  VOLUME_PRESETS,
} from "../utils/audio";
import { useState, useEffect } from "react";

interface AppVolumeControlProps {
  app: AudioApp;
  devices: AudioDevice[];
  initialStatus?: AppStatus;
  initialRoutedDeviceUid?: string | null;
  onVolumeChange?: (volume: number) => void;
}

export function AppVolumeControl({
  app,
  devices,
  initialStatus,
  initialRoutedDeviceUid,
  onVolumeChange,
}: AppVolumeControlProps) {
  const [currentVolume, setCurrentVolume] = useState<number | null>(initialStatus?.volume ?? null);
  const [systemDeviceUid, setSystemDeviceUid] = useState<string | undefined>(devices.find((d) => d.isDefault)?.uid);
  const [routedDeviceUid, setRoutedDeviceUid] = useState<string | undefined>(initialRoutedDeviceUid ?? undefined);
  const [fineTuneAvailable, setFineTuneAvailable] = useState<boolean | null>(null);
  const [fineTuneEnabled, setFineTuneEnabled] = useState<boolean>(true);
  const communicationApp = isCommunicationApp(app.name, app.bundleId);
  const presets = communicationApp ? VOLUME_PRESETS.filter((preset) => preset.value <= 100) : VOLUME_PRESETS;

  const closeWithHUD = async (message: string) => {
    try {
      await closeMainWindow();
    } catch {
      // Ignore close errors and still show feedback.
    }
    await showHUD(message);
  };

  useEffect(() => {
    setSystemDeviceUid(devices.find((d) => d.isDefault)?.uid);
  }, [devices]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const [available, enabled] = await Promise.all([isFineTuneAvailable(), isFineTuneEnabled()]);
      if (!active) return;
      setFineTuneAvailable(available);
      setFineTuneEnabled(enabled);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (initialRoutedDeviceUid !== undefined) return;
    void getAppOutputDevice(app.bundleId).then((uid) => {
      setRoutedDeviceUid(uid ?? undefined);
    });
  }, [app.bundleId, initialRoutedDeviceUid]);

  useEffect(() => {
    if (initialStatus?.volume !== null && initialStatus?.volume !== undefined) return;
    void getAppStatus(app.name, app.bundleId).then((status) => {
      if (status.volume !== null) {
        setCurrentVolume(status.volume);
      }
    });
  }, [app.bundleId, app.name, initialStatus?.volume]);

  const ensureRoutingAvailable = async (): Promise<boolean> => {
    const [available, enabled] = await Promise.all([isFineTuneAvailable(), isFineTuneEnabled()]);
    setFineTuneAvailable(available);
    setFineTuneEnabled(enabled);

    if (!available) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Per-app routing unavailable",
        message: "FineTune app not found in /Applications",
      });
      return false;
    }

    if (!enabled) {
      await showToast({
        style: Toast.Style.Failure,
        title: "FineTune is disabled",
        message: "Run 'Toggle FineTune' to enable per-app routing",
      });
      return false;
    }

    return true;
  };

  const handleSetVolume = async (volume: number) => {
    const result = await setAppVolume(app.name, volume, app.bundleId);

    if (result === "true") {
      setCurrentVolume(volume);
      onVolumeChange?.(volume);
      await closeWithHUD(`${app.name} volume set to ${volume}%`);
    } else if (result.startsWith("error:")) {
      const msg = result.replace("error: ", "");
      if (msg.includes("Allow JavaScript")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Permission Required",
          message: "Enable View > Developer > Allow JavaScript from Apple Events",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Volume control failed",
          message: msg.substring(0, 80), // Truncate long errors
        });
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Volume control not supported",
        message: "This app does not support AppleScript volume control",
      });
    }
  };

  const handleRouteOutput = async (device: AudioDevice) => {
    if (!(await ensureRoutingAvailable())) return;

    const success = await setAppOutputDevice(app.bundleId, device.uid);
    if (success) {
      setRoutedDeviceUid(device.uid);
      await closeWithHUD(`${app.name} routed to ${device.name}`);
      return;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Per-app routing unavailable",
      message: "FineTune app not found or settings not accessible",
    });
  };

  const handleRemoveRoute = async () => {
    if (!(await ensureRoutingAvailable())) return;

    const success = await removeAppOutputDevice(app.bundleId);
    if (success) {
      setRoutedDeviceUid(undefined);
      await closeWithHUD(`Removed routing for ${app.name}`);
      return;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to remove routing",
      message: "FineTune app not found or settings not accessible",
    });
  };

  const routingUnavailable = fineTuneAvailable === false || fineTuneEnabled === false;
  const routingUnavailableTitle = fineTuneAvailable === false ? "FineTune app not found" : "FineTune is disabled";
  const routingUnavailableSubtitle =
    fineTuneAvailable === false
      ? "Install FineTune in /Applications to use per-app routing"
      : "Run 'Toggle FineTune' to enable per-app routing";

  return (
    <List navigationTitle={`Control ${app.name}`}>
      <List.Section title="Volume Control">
        {presets.map((preset) => (
          <List.Item
            key={preset.value}
            title={preset.name}
            subtitle={`${preset.value}%`}
            icon={{ source: preset.icon, tintColor: currentVolume === preset.value ? Color.Orange : Color.PrimaryText }}
            accessories={currentVolume === preset.value ? [{ tag: { value: "Current", color: Color.Orange } }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={`Set Volume to ${preset.name}`}
                  icon={preset.icon}
                  onAction={() => handleSetVolume(preset.value)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={`Route ${app.name} Output (FineTune)`}>
        {routingUnavailable ? (
          <List.Item
            title={routingUnavailableTitle}
            subtitle={routingUnavailableSubtitle}
            icon={{ source: Icon.Info, tintColor: Color.Orange }}
          />
        ) : (
          devices.map((device) => {
            const isSystemCurrent = systemDeviceUid ? device.uid === systemDeviceUid : device.isDefault;
            const isRouted = device.uid === routedDeviceUid;

            return (
              <List.Item
                key={device.uid}
                title={device.name}
                icon={{
                  source: getOutputDeviceIconSource(device),
                  tintColor: isRouted ? Color.Yellow : isSystemCurrent ? Color.Blue : Color.PrimaryText,
                }}
                accessories={[
                  ...(isRouted ? [{ tag: { value: "Routed", color: Color.Yellow } }] : []),
                  ...(isSystemCurrent ? [{ tag: { value: "System", color: Color.Blue } }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Route ${app.name} to Device`}
                      icon={Icon.Switch}
                      onAction={() => handleRouteOutput(device)}
                    />
                    {isRouted && (
                      <Action
                        title={`Remove ${app.name} Route`}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={handleRemoveRoute}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}
