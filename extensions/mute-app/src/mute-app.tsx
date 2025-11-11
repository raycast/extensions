import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import getActiveSoundSources, { SoundSource } from "./utils/getActiveSoundSources";
import { toggleMuteByProcessName } from "./utils/toggleMuteByProcessName";
import path from "path";

interface Preferences {
  refreshInterval: string;
}

export default function MuteApp() {
  const [soundSources, setSoundSources] = useState<SoundSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferenceValues<Preferences>();
  const refreshIntervalMs = parseInt(preferences.refreshInterval, 10) * 1000;

  useEffect(() => {
    async function loadSoundSources() {
      try {
        const sources = await getActiveSoundSources();
        setSoundSources(sources);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load sound sources",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadSoundSources();

    // Set up interval to reload sound sources (if interval is not 0)
    if (refreshIntervalMs > 0) {
      const intervalId = setInterval(loadSoundSources, refreshIntervalMs);

      // Cleanup interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [refreshIntervalMs]);

  const handleToggleMute = async (soundSource: SoundSource, shouldCloseWindow = false) => {
    const processName = path.basename(soundSource.processPath);
    const previousMuteState = soundSource.isMuted;

    // Optimistically update UI immediately
    setSoundSources((prevSoundSources) =>
      prevSoundSources.map((prevSoundSource) =>
        prevSoundSource.pid === soundSource.pid
          ? { ...prevSoundSource, isMuted: !prevSoundSource.isMuted }
          : prevSoundSource,
      ),
    );

    try {
      if (shouldCloseWindow) {
        await closeMainWindow();
        await toggleMuteByProcessName(processName);
        return;
      }

      await toggleMuteByProcessName(processName);
      await showToast({
        style: Toast.Style.Success,
        title: soundSource.isMuted ? "Unmuted" : "Muted",
        message: `${soundSource.name}`,
      });
    } catch (error) {
      if (shouldCloseWindow) {
        await closeMainWindow();
        return;
      }

      // Revert to previous state on failure
      setSoundSources((prevSoundSources) =>
        prevSoundSources.map((prevSoundSource) =>
          prevSoundSource.pid === soundSource.pid
            ? { ...prevSoundSource, isMuted: previousMuteState }
            : prevSoundSource,
        ),
      );

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle mute",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running applications...">
      {soundSources.map((source) => (
        <List.Item
          key={source.pid}
          title={source.name}
          subtitle={source.isMuted ? "🔇 Muted" : undefined}
          accessories={source.isActive ? [{ tag: { color: Color.Green, value: "Active" } }] : []}
          icon={source.processPath ? { fileIcon: source.processPath } : undefined}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Toggle Mute"
                  icon={source.isMuted ? Icon.SpeakerOn : Icon.SpeakerOff}
                  onAction={() => handleToggleMute(source, true)}
                />
                <Action
                  title="Toggle Mute and Keep Window Open"
                  icon={source.isMuted ? Icon.SpeakerOn : Icon.SpeakerOff}
                  onAction={() => handleToggleMute(source)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
