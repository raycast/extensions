import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Keyboard,
  closeMainWindow,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  getAudioSessions,
  setApplicationVolume,
  toggleApplicationMute,
  setAllApplicationsVolume,
  muteAllApplications,
  AudioSession,
} from "./audio-utils";

export default function VolumeMixerCommand() {
  const [sessions, setSessions] = useState<AudioSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const refreshSessions = useCallback(async () => {
    try {
      const audioSessions = await getAudioSessions();
      setSessions(audioSessions);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to get audio sessions",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions();
    // Refresh every 2 seconds
    const interval = setInterval(refreshSessions, 2000);
    return () => clearInterval(interval);
  }, [refreshSessions]);

  const handleVolumeChange = async (session: AudioSession, volume: number) => {
    try {
      await setApplicationVolume(session.processId, volume);
      // Update local state immediately for responsiveness
      setSessions((prev) =>
        prev.map((s) =>
          s.processId === session.processId ? { ...s, volume } : s,
        ),
      );
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set volume",
        message: String(error),
      });
    }
  };

  const handleMuteToggle = async (session: AudioSession) => {
    try {
      const newMuteState = await toggleApplicationMute(session.processId);
      setSessions((prev) =>
        prev.map((s) =>
          s.processId === session.processId
            ? { ...s, isMuted: newMuteState }
            : s,
        ),
      );
      showToast({
        style: Toast.Style.Success,
        title: newMuteState ? "Muted" : "Unmuted",
        message: session.name,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle mute",
        message: String(error),
      });
    }
  };

  const handleSetAllVolume = async (volume: number) => {
    const confirmed = await confirmAlert({
      title: "Set All Volumes to " + volume + "%?",
      message: "This will change the volume for all applications.",
      primaryAction: {
        title: "Confirm",
      },
    });

    if (confirmed) {
      try {
        await setAllApplicationsVolume(volume);
        await refreshSessions();
        showToast({
          style: Toast.Style.Success,
          title: "All volumes set to " + volume + "%",
        });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to set volumes",
          message: String(error),
        });
      }
    }
  };

  const handleMuteAll = async () => {
    try {
      await muteAllApplications(true);
      await refreshSessions();
      showToast({
        style: Toast.Style.Success,
        title: "All applications muted",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to mute all",
        message: String(error),
      });
    }
  };

  const handleUnmuteAll = async () => {
    try {
      await muteAllApplications(false);
      await refreshSessions();
      showToast({
        style: Toast.Style.Success,
        title: "All applications unmuted",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to unmute all",
        message: String(error),
      });
    }
  };

  const filteredSessions = sessions.filter((session) =>
    session.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const getVolumeColor = (volume: number, isMuted: boolean): Color => {
    if (isMuted) return Color.SecondaryText;
    if (volume === 0) return Color.SecondaryText;
    if (volume < 30) return Color.Green;
    if (volume < 70) return Color.Yellow;
    return Color.Red;
  };

  const getVolumeIcon = (volume: number, isMuted: boolean): Icon => {
    if (isMuted || volume === 0) return Icon.VolumeDisabled;
    if (volume < 30) return Icon.VolumeLow;
    if (volume < 70) return Icon.VolumeMedium;
    return Icon.VolumeHigh;
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search applications..."
      navigationTitle="Windows Volume Mixer"
    >
      <List.EmptyView
        icon={Icon.VolumeDisabled}
        title="No Audio Sessions"
        description="No applications are currently playing audio. Start playing audio to see them here."
      />

      {filteredSessions.length > 0 && (
        <List.Section
          title="Audio Applications"
          subtitle={filteredSessions.length + " apps"}
        >
          {filteredSessions.map((session) => (
            <List.Item
              key={session.processId}
              id={String(session.processId)}
              title={session.name}
              subtitle={
                session.isMuted ? "Muted" : Math.round(session.volume) + "%"
              }
              icon={{
                source: getVolumeIcon(session.volume, session.isMuted),
                tintColor: getVolumeColor(session.volume, session.isMuted),
              }}
              accessories={[
                {
                  text: session.isMuted
                    ? "🔇"
                    : Math.round(session.volume) + "%",
                  tooltip: "Volume: " + Math.round(session.volume) + "%",
                },
                {
                  icon: session.isMuted
                    ? {
                        source: Icon.VolumeDisabled,
                        tintColor: Color.SecondaryText,
                      }
                    : {
                        source: Icon.VolumeHigh,
                        tintColor: getVolumeColor(session.volume, false),
                      },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Volume Control">
                    <Action
                      title="Increase Volume (+5%)"
                      icon={Icon.ArrowUp}
                      shortcut={Keyboard.Shortcut.Common.Up}
                      onAction={() =>
                        handleVolumeChange(
                          session,
                          Math.min(100, session.volume + 5),
                        )
                      }
                    />
                    <Action
                      title="Decrease Volume (-5%)"
                      icon={Icon.ArrowDown}
                      shortcut={Keyboard.Shortcut.Common.Down}
                      onAction={() =>
                        handleVolumeChange(
                          session,
                          Math.max(0, session.volume - 5),
                        )
                      }
                    />
                    <Action
                      title="Toggle Mute"
                      icon={
                        session.isMuted ? Icon.VolumeHigh : Icon.VolumeDisabled
                      }
                      shortcut={Keyboard.Shortcut.Common.M}
                      onAction={() => handleMuteToggle(session)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Quick Volume">
                    <Action
                      title="Set to 0%"
                      shortcut={{ modifiers: ["cmd"], key: "0" }}
                      onAction={() => handleVolumeChange(session, 0)}
                    />
                    <Action
                      title="Set to 25%"
                      shortcut={{ modifiers: ["cmd"], key: "2" }}
                      onAction={() => handleVolumeChange(session, 25)}
                    />
                    <Action
                      title="Set to 50%"
                      shortcut={{ modifiers: ["cmd"], key: "5" }}
                      onAction={() => handleVolumeChange(session, 50)}
                    />
                    <Action
                      title="Set to 75%"
                      shortcut={{ modifiers: ["cmd"], key: "7" }}
                      onAction={() => handleVolumeChange(session, 75)}
                    />
                    <Action
                      title="Set to 100%"
                      shortcut={{ modifiers: ["cmd"], key: "1" }}
                      onAction={() => handleVolumeChange(session, 100)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="All Applications">
                    <Action
                      title="Mute All Applications"
                      icon={Icon.VolumeDisabled}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                      onAction={handleMuteAll}
                    />
                    <Action
                      title="Unmute All Applications"
                      icon={Icon.VolumeHigh}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                      onAction={handleUnmuteAll}
                    />
                    <Action
                      title="Set All to 50%"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "5" }}
                      onAction={() => handleSetAllVolume(50)}
                    />
                    <Action
                      title="Set All to 100%"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "1" }}
                      onAction={() => handleSetAllVolume(100)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Actions">
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={refreshSessions}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
