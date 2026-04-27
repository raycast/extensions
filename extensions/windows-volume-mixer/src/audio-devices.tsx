import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  getAudioDevices,
  setDefaultAudioDevice,
  AudioDevice,
} from "./audio-utils";

export default function AudioDevicesCommand() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDevices = useCallback(async () => {
    try {
      const audioDevices = await getAudioDevices();
      setDevices(audioDevices);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to get audio devices",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const handleSetDefault = async (device: AudioDevice) => {
    try {
      await setDefaultAudioDevice(device.id, device.type);
      await closeMainWindow();
      showToast({
        style: Toast.Style.Success,
        title: "Default device changed",
        message: device.name + " is now the default " + device.type + " device",
      });
      await refreshDevices();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set default device",
        message: String(error),
      });
    }
  };

  const outputDevices = devices.filter((d) => d.type === "output");
  const inputDevices = devices.filter((d) => d.type === "input");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search audio devices..."
      navigationTitle="Audio Devices"
    >
      {outputDevices.length > 0 && (
        <List.Section title="Output Devices" subtitle="Speakers & Headphones">
          {outputDevices.map((device) => (
            <List.Item
              key={device.id}
              id={device.id}
              title={device.name}
              subtitle={device.isDefault ? "Default" : ""}
              icon={{
                source: device.isDefault ? Icon.CheckCircle : Icon.Speaker,
                tintColor: device.isDefault ? Color.Green : Color.PrimaryText,
              }}
              accessories={
                device.isDefault
                  ? [
                      {
                        text: "Default",
                        icon: {
                          source: Icon.CheckCircle,
                          tintColor: Color.Green,
                        },
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default Output"
                    icon={Icon.Speaker}
                    onAction={() => handleSetDefault(device)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refreshDevices}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {inputDevices.length > 0 && (
        <List.Section title="Input Devices" subtitle="Microphones">
          {inputDevices.map((device) => (
            <List.Item
              key={device.id}
              id={device.id}
              title={device.name}
              subtitle={device.isDefault ? "Default" : ""}
              icon={{
                source: device.isDefault ? Icon.CheckCircle : Icon.Microphone,
                tintColor: device.isDefault ? Color.Green : Color.PrimaryText,
              }}
              accessories={
                device.isDefault
                  ? [
                      {
                        text: "Default",
                        icon: {
                          source: Icon.CheckCircle,
                          tintColor: Color.Green,
                        },
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Default Input"
                    icon={Icon.Microphone}
                    onAction={() => handleSetDefault(device)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refreshDevices}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
