import { Action, ActionPanel, Color, Icon, List, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { AudioDevice, getDetailedAudioDevices, getOutputDeviceIconSource, switchAudioDevice } from "./utils/audio";

export default function Command() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingUid, setSwitchingUid] = useState<string | null>(null);

  const loadDevices = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const outputDevices = await getDetailedAudioDevices();
      setDevices(outputDevices);
    } catch {
      if (!silent) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load audio devices",
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const handleSetDefaultDevice = async (device: AudioDevice) => {
    setSwitchingUid(device.uid);
    try {
      const success = await switchAudioDevice(device.uid);
      if (!success) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Set default output failed",
          message: "Could not set default output device",
        });
        return;
      }

      try {
        await closeMainWindow();
      } catch {
        // Ignore close errors.
      }
      await showHUD(`Output switched to ${device.name}`);
    } finally {
      setSwitchingUid(null);
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search output devices...">
      <List.Section title="Output Devices">
        {devices.map((device) => {
          const isCurrent = device.isDefault;
          const isSwitching = switchingUid === device.uid;

          return (
            <List.Item
              key={device.uid}
              title={device.name}
              icon={{
                source: getOutputDeviceIconSource(device),
                tintColor: isCurrent ? Color.Green : Color.PrimaryText,
              }}
              accessories={[
                ...(isCurrent ? [{ tag: { value: "Current", color: Color.Green } }] : []),
                ...(isSwitching ? [{ tag: { value: "Switching...", color: Color.Yellow } }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isCurrent ? "Current Output Device" : "Set as Default Output"}
                    icon={Icon.Switch}
                    onAction={() => handleSetDefaultDevice(device)}
                  />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => loadDevices()} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {devices.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Headphones}
          title="No Output Devices Found"
          description="Try refreshing or reconnecting your audio devices"
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => loadDevices()} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
