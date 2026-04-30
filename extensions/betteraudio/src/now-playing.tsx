import { Action, ActionPanel, Detail, Icon, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  getMediaInfo,
  mediaPlayPause,
  mediaNext,
  mediaPrevious,
  mediaForward,
  mediaBackward,
  mediaShuffle,
  mediaRepeat,
} from "./lib/cli";
import { ErrorView } from "./components/ErrorView";

function formatTime(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds)) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Command() {
  const {
    data: info,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(getMediaInfo);

  if (error) return <ErrorView error={error} />;

  if (!isLoading && !info) {
    return (
      <Detail
        markdown="# No Media Playing\n\nStart playing something in a media app and try again."
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  const title = info?.title ?? "Unknown";
  const artist = info?.artist ?? "Unknown Artist";
  const album = info?.album ?? "";
  const player = info?.player ?? "";
  const position = formatTime(info?.position);
  const duration = formatTime(info?.duration);
  const status = info?.isPlaying ? "▶ Playing" : "⏸ Paused";

  const markdown = `# ${title}

**${artist}**${album ? ` — *${album}*` : ""}

---

| | |
|---|---|
| **Status** | ${status} |
| **Position** | ${position} / ${duration} |
| **Player** | ${player} |
${info?.volume != null ? `| **Volume** | ${Math.round(info.volume)}% |` : ""}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={info?.isPlaying ? "Pause" : "Play"}
            icon={info?.isPlaying ? Icon.Pause : Icon.Play}
            onAction={async () => {
              await mediaPlayPause();
              revalidate();
            }}
          />
          <Action
            title="Next Track"
            icon={Icon.Forward}
            shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
            onAction={async () => {
              await mediaNext();
              revalidate();
            }}
          />
          <Action
            title="Previous Track"
            icon={Icon.Rewind}
            shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
            onAction={async () => {
              await mediaPrevious();
              revalidate();
            }}
          />
          <Action
            title="Skip Forward 15 Seconds"
            icon={Icon.Forward}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
            onAction={async () => {
              await mediaForward(15);
              revalidate();
            }}
          />
          <Action
            title="Skip Backward 15 Seconds"
            icon={Icon.Rewind}
            shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
            onAction={async () => {
              await mediaBackward(15);
              revalidate();
            }}
          />
          <Action
            title="Toggle Shuffle"
            icon={Icon.Shuffle}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={async () => {
              await mediaShuffle();
              await showHUD("🔀 Shuffle toggled");
            }}
          />
          <Action
            title="Toggle Repeat"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              await mediaRepeat();
              await showHUD("🔁 Repeat toggled");
            }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
