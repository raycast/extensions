import { Icon, launchCommand, LaunchType, MenuBarExtra, showHUD, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync } from "fs";
import { getPlaybackState, stopPlayback } from "./audio";
import { formatDuration } from "./format";
import { getTrackById, getTracks } from "./library";
import { Track } from "./types";

type NowPlaying = {
  track: Track;
  elapsedSeconds: number;
};

export default function Command() {
  const { data: nowPlaying, isLoading } = usePromise(async (): Promise<NowPlaying | null> => {
    const playback = await getPlaybackState();
    if (!playback) {
      return null;
    }

    const tracks = await getTracks();
    const track = getTrackById(tracks, playback.trackId);
    if (!track) {
      return null;
    }

    return { track, elapsedSeconds: Math.max(0, (Date.now() - playback.startedAt) / 1000) };
  }, []);

  if (isLoading) {
    return <MenuBarExtra isLoading icon="extension-icon.png" />;
  }

  if (!nowPlaying) {
    return null;
  }

  const { track: playingTrack, elapsedSeconds } = nowPlaying;
  const durationLabel =
    playingTrack.durationSeconds !== undefined ? formatDuration(playingTrack.durationSeconds) : "--:--";
  const clampedElapsedSeconds =
    playingTrack.durationSeconds !== undefined
      ? Math.min(elapsedSeconds, playingTrack.durationSeconds)
      : elapsedSeconds;
  const timeLabel = `${formatDuration(clampedElapsedSeconds)} / ${durationLabel}`;

  const icon =
    playingTrack.coverPath && existsSync(playingTrack.coverPath) ? playingTrack.coverPath : "extension-icon.png";

  return (
    <MenuBarExtra icon={icon} tooltip={`Playing ${playingTrack.title} (${timeLabel})`}>
      <MenuBarExtra.Section title="Now Playing">
        <MenuBarExtra.Item title={playingTrack.title} subtitle={playingTrack.subtitle} />
        <MenuBarExtra.Item title={timeLabel} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Item
        title="Stop Playback"
        icon={Icon.Stop}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={async () => {
          try {
            await stopPlayback();
            await showHUD(`Stopped ${playingTrack.title}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Could not stop playback.";
            await showHUD(message);
          }
        }}
      />
      <MenuBarExtra.Item
        title="Open Affipill"
        icon={Icon.Music}
        shortcut={Keyboard.Shortcut.Common.Open}
        onAction={() => {
          void launchCommand({ name: "affipill", type: LaunchType.UserInitiated });
        }}
      />
    </MenuBarExtra>
  );
}
