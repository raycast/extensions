import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import {
  AudioApp,
  AudioDevice,
  getAppOutputDevice,
  removeAppOutputDevice,
  setAppOutputDevice,
  setAppVolume,
  VOLUME_PRESETS,
} from "../utils/audio";
import { useState, useEffect } from "react";

interface AppVolumeControlProps {
  app: AudioApp;
  devices: AudioDevice[];
  onVolumeChange?: (volume: number) => void;
}

export function AppVolumeControl({ app, devices, onVolumeChange }: AppVolumeControlProps) {
  const [currentVolume, setCurrentVolume] = useState<number | null>(null);
  const [systemDeviceUid, setSystemDeviceUid] = useState<string | undefined>(devices.find((d) => d.isDefault)?.uid);
  const [routedDeviceUid, setRoutedDeviceUid] = useState<string | undefined>();

  useEffect(() => {
    setSystemDeviceUid(devices.find((d) => d.isDefault)?.uid);
  }, [devices]);

  useEffect(() => {
    getAppOutputDevice(app.bundleId).then((uid) => {
      setRoutedDeviceUid(uid ?? undefined);
    });
  }, [app.bundleId]);

  const handleSetVolume = async (volume: number) => {
    const result = await setAppVolume(app.name, volume, app.bundleId);

    if (result === "true") {
      setCurrentVolume(volume);
      onVolumeChange?.(volume);
      showToast({ style: Toast.Style.Success, title: `Volume set to ${volume}%` });
    } else if (result.startsWith("error:")) {
      const msg = result.replace("error: ", "");
      if (msg.includes("Allow JavaScript")) {
        showToast({
          style: Toast.Style.Failure,
          title: "Permission Required",
          message: "Enable View > Developer > Allow JavaScript from Apple Events",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Volume control failed",
          message: msg.substring(0, 80), // Truncate long errors
        });
      }
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Volume control not supported",
        message: "This app does not support AppleScript volume control",
      });
    }
  };

  const handleRouteOutput = async (device: AudioDevice) => {
    const success = await setAppOutputDevice(app.bundleId, device.uid);
    if (success) {
      setRoutedDeviceUid(device.uid);
      showToast({ style: Toast.Style.Success, title: `${app.name} routed to ${device.name}` });
      return;
    }
    showToast({
      style: Toast.Style.Failure,
      title: "Per-app routing unavailable",
      message: "FineTune app not found or settings not accessible",
    });
  };

  const handleRemoveRoute = async () => {
    const success = await removeAppOutputDevice(app.bundleId);
    if (success) {
      setRoutedDeviceUid(undefined);
      showToast({ style: Toast.Style.Success, title: `Removed routing for ${app.name}` });
      return;
    }
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to remove routing",
      message: "FineTune app not found or settings not accessible",
    });
  };

  return (
    <List navigationTitle={`Control ${app.name}`}>
      <List.Section title="Volume Control">
        {VOLUME_PRESETS.map((preset) => (
          <List.Item
            key={preset.value}
            title={preset.name}
            subtitle={`${preset.value}%`}
            icon={{ source: preset.icon, tintColor: currentVolume === preset.value ? Color.Green : Color.PrimaryText }}
            accessories={currentVolume === preset.value ? [{ tag: { value: "Active", color: Color.Green } }] : []}
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
        {devices.map((device) => {
          const isSystemCurrent = systemDeviceUid ? device.uid === systemDeviceUid : device.isDefault;
          const isRouted = device.uid === routedDeviceUid;

          return (
            <List.Item
              key={device.uid}
              title={device.name}
              icon={{ source: Icon.Headphones, tintColor: isRouted ? Color.Green : Color.PrimaryText }}
              accessories={[
                ...(isRouted ? [{ tag: { value: "Routed", color: Color.Green } }] : []),
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
        })}
      </List.Section>
    </List>
  );
}
