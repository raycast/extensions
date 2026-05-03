import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useFeishinState } from "./hooks/useFeishinState";
import { PlayerRepeat, QueueSong } from "./types";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function repeatLabel(repeat?: PlayerRepeat): string {
  if (repeat === "all") return "All";
  if (repeat === "one") return "One";
  return "Off";
}

function buildMarkdown(
  song: QueueSong | null | undefined,
  albumArt: string | null,
): string {
  if (!song) return "Nothing playing — start a song in Feishin.";
  return albumArt ? `![Album Art](${albumArt})` : "";
}

export default function NowPlaying() {
  const { state, send } = useFeishinState();
  const {
    song,
    status,
    volume,
    repeat,
    shuffle,
    position,
    albumArt,
    isLoading,
    error,
  } = state;

  const isPlaying = status === "playing";
  const vol = volume ?? 50;

  let markdown: string;
  if (error) {
    markdown = `# Connection Error\n\n${error}\n\nMake sure Feishin is running with Remote Control enabled in Settings.`;
  } else if (isLoading) {
    markdown = "# Connecting to Feishin...";
  } else {
    markdown = buildMarkdown(song, albumArt);
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={song?.name ?? "Now Playing"}
      metadata={
        song ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={song.name} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Artist"
              text={song.artistName || "Unknown"}
            />
            <Detail.Metadata.Label
              title="Album"
              text={song.album || "Unknown"}
            />
            <Detail.Metadata.Label
              title="Duration"
              text={
                position != null
                  ? `${formatSeconds(position)} / ${formatDuration(song.duration)}`
                  : formatDuration(song.duration)
              }
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Status"
              text={isPlaying ? "Playing" : "Paused"}
              icon={isPlaying ? Icon.Play : Icon.Pause}
            />
            <Detail.Metadata.Label
              title="Volume"
              text={`${vol}%`}
              icon={Icon.SpeakerHigh}
            />
            <Detail.Metadata.Label
              title="Repeat"
              text={repeatLabel(repeat)}
              icon={Icon.Repeat}
            />
            <Detail.Metadata.Label
              title="Shuffle"
              text={shuffle ? "On" : "Off"}
              icon={{
                source: Icon.Shuffle,
                tintColor: shuffle ? Color.Green : Color.SecondaryText,
              }}
            />
            <Detail.Metadata.Label
              title="Favorite"
              text={song.userFavorite ? "Yes" : "No"}
              icon={{
                source: song.userFavorite ? Icon.Heart : Icon.HeartDisabled,
                tintColor: song.userFavorite ? Color.Red : Color.SecondaryText,
              }}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {song && (
            <>
              <ActionPanel.Section title="Playback">
                <Action
                  title={isPlaying ? "Pause" : "Play"}
                  icon={isPlaying ? Icon.Pause : Icon.Play}
                  onAction={() => send({ event: isPlaying ? "pause" : "play" })}
                />
                <Action
                  title="Next Track"
                  icon={Icon.Forward}
                  onAction={() => send({ event: "next" })}
                  shortcut={{ modifiers: ["ctrl"], key: "arrowRight" }}
                />
                <Action
                  title="Previous Track"
                  icon={Icon.Rewind}
                  onAction={() => send({ event: "previous" })}
                  shortcut={{ modifiers: ["ctrl"], key: "arrowLeft" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Controls">
                <Action
                  title={song.userFavorite ? "Unfavorite" : "Favorite"}
                  icon={song.userFavorite ? Icon.HeartDisabled : Icon.Heart}
                  onAction={() =>
                    send({
                      event: "favorite",
                      id: song.id,
                      favorite: !song.userFavorite,
                    })
                  }
                  shortcut={{ modifiers: ["ctrl"], key: "l" }}
                />
                <Action
                  title="Toggle Shuffle"
                  icon={Icon.Shuffle}
                  onAction={() => send({ event: "shuffle" })}
                  shortcut={{ modifiers: ["ctrl"], key: "s" }}
                />
                <Action
                  title="Cycle Repeat"
                  icon={Icon.Repeat}
                  onAction={() => send({ event: "repeat" })}
                  shortcut={{ modifiers: ["ctrl"], key: "r" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Volume">
                <Action
                  title="Volume up (+10%)"
                  icon={Icon.SpeakerHigh}
                  onAction={() =>
                    send({ event: "volume", volume: Math.min(100, vol + 10) })
                  }
                  shortcut={{ modifiers: ["ctrl"], key: "arrowUp" }}
                />
                <Action
                  title="Volume Down (-10%)"
                  icon={Icon.SpeakerLow}
                  onAction={() =>
                    send({ event: "volume", volume: Math.max(0, vol - 10) })
                  }
                  shortcut={{ modifiers: ["ctrl"], key: "arrowDown" }}
                />
                <Action
                  title="Set Volume to 0%"
                  icon={Icon.SpeakerLow}
                  onAction={() => send({ event: "volume", volume: 0 })}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "0" }}
                />
                <Action
                  title="Set Volume to 50%"
                  icon={Icon.SpeakerHigh}
                  onAction={() => send({ event: "volume", volume: 50 })}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "5" }}
                />
                <Action
                  title="Set Volume to 100%"
                  icon={Icon.SpeakerHigh}
                  onAction={() => send({ event: "volume", volume: 100 })}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "9" }}
                />
              </ActionPanel.Section>
            </>
          )}
          {!song && !isLoading && (
            <Action
              title="Refresh"
              icon={Icon.RotateClockwise}
              onAction={() => popToRoot()}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
