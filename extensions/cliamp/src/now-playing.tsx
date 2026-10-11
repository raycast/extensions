import { Action, ActionPanel, Color, Detail, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { callOp, EQ_PRESETS, fmtTime, getSnapshot, Snapshot, SPEEDS, startDaemon, trackLabel } from "./lib/ipc";

function progressBar(position?: number, duration?: number): string {
  if (!duration || !position || duration <= 0) return "";
  const width = 30;
  const filled = Math.min(width, Math.round((position / duration) * width));
  return "`" + "█".repeat(filled) + "░".repeat(width - filled) + "`";
}

function markdown(s: Snapshot): string {
  const track = s.track ?? s.logical_track;
  const stateIcon = s.state === "playing" ? "▶︎" : s.state === "paused" ? "⏸" : "⏹";
  const lines = [`# ${stateIcon}  ${trackLabel(track)}`];
  if (track?.artist && track?.album) lines.push(`**${track.artist}** · ${track.album}`);
  if (track?.stream || track?.realtime) {
    lines.push(`🔴 Live stream${track?.genre ? ` · ${String(track.genre).split(",").slice(0, 3).join(", ")}` : ""}`);
  } else if (s.duration) {
    lines.push(`${fmtTime(s.position)} / ${fmtTime(s.duration)}`);
    const bar = progressBar(s.position, s.duration);
    if (bar) lines.push(bar);
  }
  if (s.stream_error) lines.push(`\n⚠️ ${s.stream_error}`);
  return lines.join("\n\n");
}

export default function NowPlaying() {
  const { data, isLoading, error, revalidate } = usePromise(getSnapshot);

  useEffect(() => {
    const t = setInterval(revalidate, 3000);
    return () => clearInterval(t);
  }, [revalidate]);

  async function run(operation: string, params: Record<string, unknown> = {}, message?: string) {
    try {
      await callOp(operation, params);
      if (message) await showToast({ style: Toast.Style.Success, title: message });
      revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "cliamp error",
        message: String(e instanceof Error ? e.message : e),
      });
    }
  }

  if (error) {
    return (
      <Detail
        markdown={`# cliamp is not running\n\n${error.message}\n\nStart the daemon and try again.`}
        actions={
          <ActionPanel>
            <Action
              title="Start Cliamp Daemon"
              icon={Icon.Play}
              onAction={async () => {
                try {
                  await startDaemon();
                  revalidate();
                } catch (e) {
                  await showToast({ style: Toast.Style.Failure, title: "Could not start daemon", message: String(e) });
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const s = data;
  const playing = s?.state === "playing";

  return (
    <Detail
      isLoading={isLoading}
      markdown={s ? markdown(s) : "Loading…"}
      metadata={
        s && (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="State">
              <Detail.Metadata.TagList.Item
                text={s.state}
                color={playing ? Color.Green : s.state === "paused" ? Color.Yellow : Color.SecondaryText}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Playlist" text={`${s.total ?? 0} tracks`} />
            {s.play_next_total ? (
              <Detail.Metadata.Label title="Play Next" text={`${s.play_next_total} queued`} />
            ) : null}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Shuffle" text={s.shuffle ? "On" : "Off"} />
            <Detail.Metadata.Label title="Repeat" text={s.repeat ?? "Off"} />
            <Detail.Metadata.Label title="Mono" text={s.mono ? "On" : "Off"} />
            <Detail.Metadata.Label title="Speed" text={`${s.speed ?? 1}×`} />
            {s.volume !== undefined && <Detail.Metadata.Label title="Volume" text={`${s.volume} dB`} />}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="EQ Preset" text={s.eq_preset || "Custom"} />
            {s.visualizer && <Detail.Metadata.Label title="Visualizer" text={s.visualizer} />}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Playback">
            <Action
              title={playing ? "Pause" : "Play"}
              icon={playing ? Icon.Pause : Icon.Play}
              onAction={() => run("toggle")}
            />
            <Action
              title="Next Track"
              icon={Icon.Forward}
              shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
              onAction={() => run("next")}
            />
            <Action
              title="Previous Track"
              icon={Icon.Rewind}
              shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
              onAction={() => run("prev")}
            />
            <Action
              title="Stop"
              icon={Icon.Stop}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => run("stop")}
            />
            {s?.seekable && (
              <>
                <Action
                  title="Seek Forward"
                  icon={Icon.ArrowRightCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
                  onAction={() => run("seek", { value: 15 })}
                />
                <Action
                  title="Seek Back"
                  icon={Icon.ArrowLeftCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
                  onAction={() => run("seek", { value: -15 })}
                />
              </>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Volume">
            <Action
              title="Raise Volume"
              icon={Icon.SpeakerUp}
              shortcut={{ modifiers: ["cmd"], key: "=" }}
              onAction={() => run("volume.adjust", { value: 3 }, "Volume +3 dB")}
            />
            <Action
              title="Lower Volume"
              icon={Icon.SpeakerDown}
              shortcut={{ modifiers: ["cmd"], key: "-" }}
              onAction={() => run("volume.adjust", { value: -3 }, "Volume −3 dB")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Modes">
            <Action
              title={s?.shuffle ? "Turn Shuffle off" : "Turn Shuffle on"}
              icon={Icon.Shuffle}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={() => run("shuffle", { name: "toggle" })}
            />
            <Action
              title={`Cycle Repeat Mode (${s?.repeat ?? "Off"})`}
              icon={Icon.Repeat}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => run("repeat", { name: "cycle" })}
            />
            <Action
              title={s?.mono ? "Turn Mono off" : "Turn Mono on"}
              icon={Icon.Speaker}
              onAction={() => run("mono", { name: "toggle" })}
            />
            <ActionPanel.Submenu title="Playback Speed" icon={Icon.Gauge} shortcut={Keyboard.Shortcut.Common.Duplicate}>
              {SPEEDS.map((v) => (
                <Action
                  key={v}
                  title={`${v}×${s?.speed === v ? "  ✓" : ""}`}
                  onAction={() => run("speed", { value: v })}
                />
              ))}
            </ActionPanel.Submenu>
            <ActionPanel.Submenu title="EQ Preset" icon={Icon.LevelMeter} shortcut={Keyboard.Shortcut.Common.Edit}>
              {EQ_PRESETS.map((name) => (
                <Action
                  key={name}
                  title={`${name}${s?.eq_preset === name ? "  ✓" : ""}`}
                  onAction={() => run("eq", { name }, `EQ: ${name}`)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={revalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
