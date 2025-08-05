import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  WisprStats,
  AudioDevice,
  formatNumber,
  getWisprStats,
  getAudioInputDevices,
  getCurrentWisprMicrophone,
  getCurrentSystemInputDevice,
  setWisprMicrophone,
} from "./utils";

interface Preferences {
  showMenuBar: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [stats, setStats] = useState<WisprStats>({ totalWords: 0, averageWPM: 0 });
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [currentMicId, setCurrentMicId] = useState<string | null>(null);
  const [currentSystemMic, setCurrentSystemMic] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // If menu bar is disabled in preferences, don't show anything
  if (!preferences.showMenuBar) {
    return null;
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsResult, devicesResult, systemMic] = await Promise.all([
          getWisprStats(),
          getAudioInputDevices(),
          getCurrentSystemInputDevice(),
        ]);

        setStats(statsResult);
        setAudioDevices(devicesResult);
        setCurrentMicId(getCurrentWisprMicrophone());
        setCurrentSystemMic(systemMic);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Update trigger for interval refreshes
  const [, setUpdateTrigger] = useState(0);
  useEffect(() => {
    const interval = setInterval(
      () => {
        setUpdateTrigger((n) => n + 1);
        getWisprStats().then(setStats);
      },
      60 * 60 * 1000,
    ); // 60 minutes
    return () => clearInterval(interval);
  }, []);

  const handleMicrophoneChange = async (deviceId: string) => {
    try {
      await setWisprMicrophone(deviceId);
      setCurrentMicId(deviceId);
    } catch (error) {
      console.error("Error changing microphone:", error);
    }
  };

  const menuBarText =
    stats.totalWords > 0 || stats.averageWPM > 0
      ? `🚀 ${formatNumber(stats.totalWords)} | 🏆 ${stats.averageWPM}`
      : "Loading...";

  // Find the current microphone name for display
  const currentMic = audioDevices.find((device) => device.id === currentMicId || device.name === currentMicId);
  let currentMicName = "Unknown";

  if (currentMic) {
    currentMicName = currentMic.name;
  } else if (currentSystemMic) {
    currentMicName = currentSystemMic;
  } else if (currentMicId) {
    // Show abbreviated device ID if we can't resolve the name
    currentMicName = `Device ${currentMicId.substring(0, 8)}...`;
  }

  return (
    <MenuBarExtra title={menuBarText} isLoading={isLoading}>
      <MenuBarExtra.Item title={`🚀 Total Words: ${formatNumber(stats.totalWords)}`} />
      <MenuBarExtra.Item title={`🏆 Average WPM: ${stats.averageWPM}`} />

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item title={`🎤 Current Mic: ${currentMicName}`} />
      <MenuBarExtra.Separator />

      <MenuBarExtra.Section title="Switch Microphone">
        {audioDevices.length > 0 ? (
          audioDevices.map((device) => {
            const isSelected =
              currentMicId === device.id || currentMicId === device.name || currentSystemMic === device.name;

            return (
              <MenuBarExtra.Item
                key={device.id}
                title={`${device.name}${device.manufacturer ? ` (${device.manufacturer})` : ""}`}
                subtitle={device.isDefault ? "System Default" : undefined}
                icon={isSelected ? "checkmark" : undefined}
                onAction={() => handleMicrophoneChange(device.name)}
              />
            );
          })
        ) : (
          <MenuBarExtra.Item title="No microphones detected" subtitle="Try refreshing or check system permissions" />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
