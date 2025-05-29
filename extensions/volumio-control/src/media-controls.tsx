import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { VolumioAPI, PlayerState } from "./volumio-api";

export default function MediaControls() {
  const [state, setState] = useState<PlayerState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const api = new VolumioAPI();

  async function loadState() {
    try {
      const playerState = await api.getPlayerState();
      setState(playerState);
      setIsLoading(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect to Volumio",
        message: "Check your Volumio host settings",
      });
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 2000);
    return () => clearInterval(interval);
  }, []);

  async function handleAction(action: () => Promise<void>, successMessage: string) {
    try {
      await action();
      showToast({
        style: Toast.Style.Success,
        title: successMessage,
      });
      setTimeout(loadState, 500);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Action failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const isPlaying = state?.status === "play";
  const currentTrack = state?.title || "No track playing";
  const artist = state?.artist || "";
  const album = state?.album || "";
  const albumArt = state?.albumart ? api.getAlbumArtUrl(state.albumart) : undefined;

  const formatTime = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress =
    state?.position && state?.duration ? `${formatTime(state.position)} / ${formatTime(state.duration)}` : "";

  return (
    <List isLoading={isLoading}>
      <List.Section title="Now Playing">
        <List.Item
          title={currentTrack}
          subtitle={artist}
          accessories={[{ text: album }, { text: progress }]}
          icon={albumArt || Icon.Music}
        />
      </List.Section>

      <List.Section title="Playback Controls">
        <List.Item
          title={isPlaying ? "Pause" : "Play"}
          icon={isPlaying ? Icon.Pause : Icon.Play}
          actions={
            <ActionPanel>
              <Action
                title={isPlaying ? "Pause" : "Play"}
                onAction={() => handleAction(() => api.toggle(), isPlaying ? "Paused" : "Playing")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Previous Track"
          icon={Icon.Rewind}
          actions={
            <ActionPanel>
              <Action title="Previous" onAction={() => handleAction(() => api.previous(), "Previous track")} />
            </ActionPanel>
          }
        />

        <List.Item
          title="Next Track"
          icon={Icon.Forward}
          actions={
            <ActionPanel>
              <Action title="Next" onAction={() => handleAction(() => api.next(), "Next track")} />
            </ActionPanel>
          }
        />

        <List.Item
          title="Stop"
          icon={Icon.Stop}
          actions={
            <ActionPanel>
              <Action title="Stop" onAction={() => handleAction(() => api.stop(), "Stopped")} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Volume & Settings">
        <List.Item
          title="Volume"
          subtitle={`${state?.volume || 0}%`}
          icon={state?.mute ? Icon.SpeakerOff : Icon.SpeakerHigh}
          actions={
            <ActionPanel>
              <Action
                title="Toggle Mute"
                onAction={() => handleAction(() => api.toggleMute(), state?.mute ? "Unmuted" : "Muted")}
              />
              <Action
                title="Volume Up"
                onAction={() => handleAction(() => api.setVolume((state?.volume || 0) + 10), "Volume increased")}
              />
              <Action
                title="Volume Down"
                onAction={() =>
                  handleAction(() => api.setVolume(Math.max(0, (state?.volume || 0) - 10)), "Volume decreased")
                }
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Shuffle"
          subtitle={state?.random ? "On" : "Off"}
          icon={Icon.Shuffle}
          actions={
            <ActionPanel>
              <Action
                title="Toggle Shuffle"
                onAction={() => handleAction(() => api.toggleRandom(), state?.random ? "Shuffle off" : "Shuffle on")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Repeat"
          subtitle={state?.repeat ? "On" : "Off"}
          icon={Icon.Repeat}
          actions={
            <ActionPanel>
              <Action
                title="Toggle Repeat"
                onAction={() => handleAction(() => api.toggleRepeat(), state?.repeat ? "Repeat off" : "Repeat on")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
