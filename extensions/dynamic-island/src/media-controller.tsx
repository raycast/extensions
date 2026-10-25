import { Action, ActionPanel, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getIslandStatus, MediaTrackInfo, sendSocketCommand, startDaemonIfNotRunning } from "./lib/ipc";

export default function MediaController() {
  const [media, setMedia] = useState<MediaTrackInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const status = await getIslandStatus();
      if (status) {
        setMedia(status.media);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
    const interval = setInterval(fetchMedia, 1500);
    return () => clearInterval(interval);
  }, []);

  const handlePlayPause = async () => {
    try {
      await sendSocketCommand({ action: "media_playpause" });
      await sendSocketCommand({
        action: "expand",
        widget: "music",
        duration: 3.0,
      });
      await fetchMedia();
      await showToast({
        style: Toast.Style.Success,
        title: "Toggled Playback",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to control media",
      });
    }
  };

  const handleNext = async () => {
    try {
      await sendSocketCommand({ action: "media_next" });
      await sendSocketCommand({
        action: "expand",
        widget: "music",
        duration: 3.0,
      });
      await fetchMedia();
      await showToast({ style: Toast.Style.Success, title: "Next Track" });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to skip track",
      });
    }
  };

  const handlePrevious = async () => {
    try {
      await sendSocketCommand({ action: "media_prev" });
      await sendSocketCommand({
        action: "expand",
        widget: "music",
        duration: 3.0,
      });
      await fetchMedia();
      await showToast({ style: Toast.Style.Success, title: "Previous Track" });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to skip back",
      });
    }
  };

  const handleExpandOnNotch = async () => {
    try {
      await startDaemonIfNotRunning();
      await sendSocketCommand({ action: "expand", widget: "music" });
      await showToast({
        style: Toast.Style.Success,
        title: "Expanded on Notch",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to expand on notch",
      });
    }
  };

  const formatSeconds = (sec: number) => {
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search playback controls...">
      <List.Section title="Now Playing">
        <List.Item
          icon={{
            source: media?.isPlaying ? Icon.Play : Icon.Pause,
            tintColor: media?.isPlaying ? Color.Green : Color.SecondaryText,
          }}
          title={media?.title || "No Media Playing"}
          subtitle={media?.artist || "Open Spotify or Apple Music"}
          accessories={[
            {
              text: media?.appName ? media.appName : undefined,
              icon: media?.appName ? Icon.Music : undefined,
            },
            {
              text:
                media && media.duration > 0
                  ? `${formatSeconds(media.elapsed)} / ${formatSeconds(media.duration)}`
                  : undefined,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={media?.isPlaying ? "Pause" : "Play"}
                icon={media?.isPlaying ? Icon.Pause : Icon.Play}
                onAction={handlePlayPause}
              />
              <Action
                title="Next Track"
                icon={Icon.Forward}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={handleNext}
              />
              <Action
                title="Previous Track"
                icon={Icon.Rewind}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                onAction={handlePrevious}
              />
              <Action
                title="Expand on Notch Island"
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={handleExpandOnNotch}
              />
              <Action title="Open Spotify" icon={Icon.AppWindow} onAction={() => open("spotify:")} />
              <Action title="Open Apple Music" icon={Icon.AppWindow} onAction={() => open("music:")} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Quick Actions">
        <List.Item
          icon={Icon.PlayFilled}
          title="Play / Pause"
          subtitle="Toggle playback state"
          actions={
            <ActionPanel>
              <Action title="Toggle Play / Pause" onAction={handlePlayPause} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Forward}
          title="Next Track"
          subtitle="Skip to the next song"
          actions={
            <ActionPanel>
              <Action title="Next Track" onAction={handleNext} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Rewind}
          title="Previous Track"
          subtitle="Return to previous track"
          actions={
            <ActionPanel>
              <Action title="Previous Track" onAction={handlePrevious} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
