import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { VolumioAPI, PlayerState } from "./volumio-api";

export default function NowPlaying() {
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

  const formatTime = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!state) {
    return <Detail markdown="Unable to connect to Volumio" />;
  }

  const isPlaying = state.status === "play";
  const progress =
    state.position && state.duration ? `${formatTime(state.position)} / ${formatTime(state.duration)}` : "";
  const progressBar = state.position && state.duration ? Math.floor((state.position / state.duration) * 20) : 0;
  const progressIndicator = "▓".repeat(progressBar) + "░".repeat(20 - progressBar);

  const albumArtUrl = state.albumart ? api.getAlbumArtUrl(state.albumart) : "";

  const markdown = albumArtUrl ? `![Album Art](${albumArtUrl})` : `# No Album Art\n\n_No cover image available_`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={state.title || "No track playing"} />
          <Detail.Metadata.Label title="Artist" text={state.artist || "Unknown"} />
          <Detail.Metadata.Label title="Album" text={state.album || "Unknown"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Status"
            text={isPlaying ? "Playing" : "Paused"}
            icon={isPlaying ? "▶️" : "⏸"}
          />
          <Detail.Metadata.Label title="Progress" text={progress} />
          <Detail.Metadata.Label title="" text={progressIndicator} />
          <Detail.Metadata.Label title="Volume" text={`${state.volume || 0}%`} icon={state.mute ? "🔇" : "🔊"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Shuffle" text={state.random ? "On" : "Off"} icon={state.random ? "🔀" : "➡️"} />
          <Detail.Metadata.Label title="Repeat" text={state.repeat ? "On" : "Off"} icon={state.repeat ? "🔁" : "➡️"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title={isPlaying ? "Pause" : "Play"} onAction={() => api.toggle()} />
          <Action title="Next Track" onAction={() => api.next()} />
          <Action title="Previous Track" onAction={() => api.previous()} />
          <Action title="Stop" onAction={() => api.stop()} />
          <ActionPanel.Section>
            <Action title="Toggle Shuffle" onAction={() => api.toggleRandom()} />
            <Action title="Toggle Repeat" onAction={() => api.toggleRepeat()} />
            <Action title="Toggle Mute" onAction={() => api.toggleMute()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
