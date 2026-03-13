import { Action, ActionPanel, Color, Icon, List, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import {
  AudioApp,
  AppStatus,
  AudioDevice,
  canControlAppVolume,
  getAppStatus,
  getAppVolumeControlCapability,
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
import { useEffect, useRef, useState } from "react";

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
  const missingFineTuneToastShownRef = useRef(false);
  const communicationApp = isCommunicationApp(app.name, app.bundleId);
  const presets = communicationApp ? VOLUME_PRESETS.filter((preset) => preset.value <= 100) : VOLUME_PRESETS;
  const observedVolume = currentVolume ?? initialStatus?.volume ?? null;
  const volumeCapability = getAppVolumeControlCapability(app.name, {
    bundleId: app.bundleId,
    observedVolume,
  });
  const volumeControlsAvailable = canControlAppVolume(volumeCapability, {
    fineTuneAvailable,
    fineTuneEnabled,
  });

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
    if (fineTuneAvailable !== false || missingFineTuneToastShownRef.current) return;

    missingFineTuneToastShownRef.current = true;
    const message =
      volumeCapability.kind === "fineTune"
        ? `Install FineTune in /Applications to control volume or routing for ${app.name}`
        : "Install FineTune in /Applications to use per-app routing";

    void showToast({
      style: Toast.Style.Failure,
      title: "FineTune app not found",
      message,
    });
  }, [app.name, fineTuneAvailable, volumeCapability.kind]);

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

  const getVolumeUnavailableCopy = () => {
    if (volumeCapability.kind === "fineTune") {
      if (fineTuneAvailable === false) {
        return {
          title: "FineTune app not found",
          subtitle: `Install FineTune in /Applications to control volume for ${app.name}`,
        };
      }

      if (fineTuneEnabled === false) {
        return {
          title: "FineTune is disabled",
          subtitle: `Run 'Toggle FineTune' to control volume for ${app.name}`,
        };
      }

      return {
        title: "Checking FineTune availability",
        subtitle: "One moment...",
      };
    }

    if (volumeCapability.reason === "unsupported-browser") {
      return {
        title: "Direct app volume unavailable",
        subtitle: "Firefox-based browsers do not expose AppleScript volume control",
      };
    }

    return {
      title: "Direct app volume unavailable",
      subtitle: `${app.name} does not expose a direct volume API that Raycast can use`,
    };
  };

  const handleSetVolume = async (volume: number) => {
    if (!volumeControlsAvailable) {
      const unavailable = getVolumeUnavailableCopy();
      await showToast({
        style: Toast.Style.Failure,
        title: unavailable.title,
        message: unavailable.subtitle,
      });
      return;
    }

    const result = await setAppVolume(app.name, volume, app.bundleId);

    if (result === "true") {
      setCurrentVolume(volume);
      onVolumeChange?.(volume);
      await closeWithHUD(`${app.name} volume set to ${volume}%`);
    } else if (result.startsWith("error:")) {
      const msg = result.replace("error: ", "");
      const lowerMessage = msg.toLowerCase();

      if (msg.includes("Allow JavaScript")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Permission Required",
          message: "Enable View > Developer > Allow JavaScript from Apple Events",
        });
      } else if (lowerMessage.includes("no open websites found")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Controllable Browser Tab",
          message: "Open audio in the front browser window and try again",
        });
      } else {
        const unavailable = getVolumeUnavailableCopy();
        await showToast({
          style: Toast.Style.Failure,
          title: volumeCapability.kind === "direct" ? "Volume control failed" : unavailable.title,
          message:
            volumeCapability.kind === "direct"
              ? "Raycast couldn't change the volume for this app."
              : unavailable.subtitle,
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

  const getVolumeTitle = (presetValue: number) => {
    if (currentVolume === presetValue) {
      return `Current Volume: ${presetValue}%`;
    }

    return undefined;
  };

  const getVolumeTitleOrName = (presetName: string, presetValue: number) => {
    return getVolumeTitle(presetValue) ?? presetName;
  };

  const getVolumeSubtitle = (presetName: string, presetValue: number) => {
    if (currentVolume === presetValue) {
      return presetName;
    }

    return `${presetValue}%`;
  };

  const getOutputTitle = (device: AudioDevice, isSystemCurrent: boolean, isRouted: boolean) => {
    if (isRouted || (!routedDeviceUid && isSystemCurrent)) {
      return `Current Output: ${device.name}`;
    }

    return device.name;
  };

  const getOutputSubtitle = (isSystemCurrent: boolean, isRouted: boolean) => {
    if (isRouted) {
      return "Per-app routed output";
    }

    if (!routedDeviceUid && isSystemCurrent) {
      return "System output device";
    }

    return undefined;
  };

  const volumeUnavailableCopy = getVolumeUnavailableCopy();
  const routingStatusLoading = fineTuneAvailable === null;
  const routingUnavailable = fineTuneAvailable === false || fineTuneEnabled === false;
  const routingUnavailableTitle = fineTuneAvailable === false ? "FineTune app not found" : "FineTune is disabled";
  const routingUnavailableSubtitle =
    fineTuneAvailable === false
      ? "Install FineTune in /Applications to use per-app routing"
      : "Run 'Toggle FineTune' to enable per-app routing";

  return (
    <List navigationTitle={`Control ${app.name}`}>
      <List.Section title="Volume Control">
        {volumeControlsAvailable ? (
          presets.map((preset) => (
            <List.Item
              key={preset.value}
              title={getVolumeTitleOrName(preset.name, preset.value)}
              subtitle={getVolumeSubtitle(preset.name, preset.value)}
              icon={{
                source: preset.icon,
                tintColor: currentVolume === preset.value ? Color.Green : Color.PrimaryText,
              }}
              accessories={currentVolume === preset.value ? [{ tag: { value: "Current", color: Color.Green } }] : []}
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
          ))
        ) : (
          <List.Item
            title={volumeUnavailableCopy.title}
            subtitle={volumeUnavailableCopy.subtitle}
            icon={{
              source: volumeCapability.kind === "fineTune" && fineTuneAvailable === null ? Icon.Clock : Icon.Info,
              tintColor: Color.Orange,
            }}
          />
        )}
      </List.Section>

      <List.Section title={`Route ${app.name} Output (FineTune)`}>
        {routingStatusLoading ? (
          <List.Item
            title="Checking FineTune availability"
            subtitle="One moment..."
            icon={{ source: Icon.Clock, tintColor: Color.Orange }}
          />
        ) : routingUnavailable ? (
          <List.Item
            title={routingUnavailableTitle}
            subtitle={routingUnavailableSubtitle}
            icon={{ source: Icon.Info, tintColor: Color.Orange }}
          />
        ) : (
          devices.map((device) => {
            const isSystemCurrent = systemDeviceUid ? device.uid === systemDeviceUid : device.isDefault;
            const isRouted = device.uid === routedDeviceUid;
            const isCurrentOutput = isRouted || (!routedDeviceUid && isSystemCurrent);

            return (
              <List.Item
                key={device.uid}
                title={getOutputTitle(device, isSystemCurrent, isRouted)}
                subtitle={getOutputSubtitle(isSystemCurrent, isRouted)}
                icon={{
                  source: getOutputDeviceIconSource(device),
                  tintColor: isCurrentOutput ? Color.Green : Color.PrimaryText,
                }}
                accessories={[
                  ...(isCurrentOutput ? [{ tag: { value: "Current", color: Color.Green } }] : []),
                  ...(!isCurrentOutput && isSystemCurrent
                    ? [{ tag: { value: "System", color: Color.PrimaryText } }]
                    : []),
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
