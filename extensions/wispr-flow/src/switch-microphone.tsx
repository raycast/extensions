import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  AudioDevice,
  getAudioInputDevices,
  getCurrentWisprMicrophone,
  getCurrentSystemInputDevice,
  setWisprMicrophone,
} from "./utils";

export default function Command() {
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [currentMicId, setCurrentMicId] = useState<string | null>(null);
  const [currentSystemMic, setCurrentSystemMic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [devicesResult, systemMic] = await Promise.all([getAudioInputDevices(), getCurrentSystemInputDevice()]);

        setAudioDevices(devicesResult);
        setCurrentMicId(getCurrentWisprMicrophone());
        setCurrentSystemMic(systemMic);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading microphone data:", error);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleMicrophoneChange = async (deviceName: string) => {
    try {
      await setWisprMicrophone(deviceName);
      setCurrentMicId(deviceName);
    } catch (error) {
      console.error("Error changing microphone:", error);
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Switch Microphone">
      {audioDevices.length > 0 ? (
        audioDevices.map((device) => {
          const isSelected =
            currentMicId === device.id || currentMicId === device.name || currentSystemMic === device.name;

          return (
            <List.Item
              key={device.id}
              title={device.name}
              subtitle={device.manufacturer || undefined}
              accessories={[
                ...(device.isDefault ? [{ text: "System Default" }] : []),
                ...(isSelected ? [{ icon: Icon.CheckCircle }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action title="Select This Microphone" onAction={() => handleMicrophoneChange(device.name)} />
                  <Action.CopyToClipboard title="Copy Device Name" content={device.name} />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.Item title="No microphones detected" subtitle="Try refreshing or check system permissions" />
      )}
    </List>
  );
}
