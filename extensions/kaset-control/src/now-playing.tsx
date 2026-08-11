import { Action, ActionPanel, Detail, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getKasetState,
  playPause,
  nextTrack,
  previousTrack,
  toggleShuffle,
  cycleRepeat,
  toggleMute,
  formatTime,
  isKasetRunning,
} from "./utils/kaset";

export default function NowPlaying() {
  const { data: state, isLoading, revalidate } = usePromise(getKasetState);
  const { data: running } = usePromise(isKasetRunning);

  if (!running) {
    return (
      <Detail
        markdown="# Kaset is not running\n\nPlease launch Kaset to use this extension."
        actions={
          <ActionPanel>
            <Action.Open title="Launch Kaset" target="kaset://" />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading markdown="Loading..." />;
  }

  if (!state || !state.currentTrack) {
    return (
      <Detail
        markdown="# No track playing\n\nStart playing something in Kaset."
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

  const track = state.currentTrack;
  const progress =
    state.duration > 0 ? (state.position / state.duration) * 100 : 0;
  const progressBar = generateProgressBar(progress);

  const artworkMarkdown = track.artworkURL
    ? `![Artwork](${track.artworkURL})\n\n`
    : "";

  const markdown = `
${artworkMarkdown}
# ${track.name}

**${track.artist}**${track.album ? ` • ${track.album}` : ""}

---

${progressBar}

${formatTime(state.position)} / ${formatTime(state.duration)}

---

${state.playerState === "playing" ? "▶️ Playing" : "⏸️ Paused"}${state.shuffling ? " • 🔀 Shuffle" : ""}${state.repeating !== "off" ? ` • 🔁 Repeat ${state.repeating === "all" ? "All" : "One"}` : ""}${state.muted ? " • 🔇 Muted" : ` • 🔊 ${state.volume}%`}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Playback">
            <Action
              title={state.playerState === "playing" ? "Pause" : "Play"}
              icon={state.playerState === "playing" ? Icon.Pause : Icon.Play}
              onAction={async () => {
                await playPause();
                revalidate();
              }}
            />
            <Action
              title="Next Track"
              icon={Icon.Forward}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              onAction={async () => {
                await nextTrack();
                setTimeout(revalidate, 500);
              }}
            />
            <Action
              title="Previous Track"
              icon={Icon.Rewind}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={async () => {
                await previousTrack();
                setTimeout(revalidate, 500);
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Options">
            <Action
              title={state.shuffling ? "Shuffle Off" : "Shuffle On"}
              icon={{
                source: Icon.Shuffle,
                tintColor: state.shuffling ? Color.Blue : undefined,
              }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={async () => {
                await toggleShuffle();
                revalidate();
              }}
            />
            <Action
              title={`Repeat: ${state.repeating === "off" ? "Off" : state.repeating === "all" ? "All" : "One"}`}
              icon={{
                source: Icon.Repeat,
                tintColor: state.repeating !== "off" ? Color.Blue : undefined,
              }}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await cycleRepeat();
                revalidate();
              }}
            />
            <Action
              title={state.muted ? "Unmute" : "Mute"}
              icon={state.muted ? Icon.SpeakerOff : Icon.SpeakerHigh}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={async () => {
                await toggleMute();
                revalidate();
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function generateProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  return `\`[${"█".repeat(filled)}${"░".repeat(empty)}]\``;
}
