import { Icon, MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";
import { api, formatDuration } from "./api";
import type { Status } from "./types";

export default function MenuBarPlayer() {
  const [status, setStatus] = useState<Status | null>(null);

  async function refresh() {
    try {
      setStatus(await api.status());
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, []);

  async function cmd(fn: () => Promise<void>) {
    try {
      await fn();
      setTimeout(refresh, 300);
    } catch {
      /* tuidal not running */
    }
  }

  const isPlaying = status?.state === "playing";
  const hasTracks = !!status?.title;

  const barTitle = hasTracks
    ? `${status!.artist} — ${status!.title}`
    : undefined;

  const elapsed = status ? formatDuration(status.elapsed) : "";
  const duration = status?.duration ? formatDuration(status.duration) : "";
  const progress = status ? Math.round(status.progress * 100) : 0;

  return (
    <MenuBarExtra icon={Icon.Music} title={barTitle} tooltip="Tuidal">
      {hasTracks ? (
        <>
          <MenuBarExtra.Item
            title={`${isPlaying ? "▶" : "⏸"} ${status!.title}`}
          />
          <MenuBarExtra.Item title={`   by ${status!.artist}`} />
          <MenuBarExtra.Item title={`   ${status!.album}`} />
          {elapsed && (
            <MenuBarExtra.Item
              title={`   ${elapsed} / ${duration}  (${progress}%)`}
            />
          )}
          <MenuBarExtra.Separator />
        </>
      ) : (
        <MenuBarExtra.Item
          title={status ? "Nothing playing" : "Tuidal not running"}
        />
      )}

      <MenuBarExtra.Item
        title={isPlaying ? "Pause" : "Play"}
        icon={isPlaying ? Icon.Pause : Icon.Play}
        shortcut={{ modifiers: [], key: "space" }}
        onAction={() => cmd(api.playPause)}
      />
      <MenuBarExtra.Item
        title="Next Track"
        icon={Icon.Forward}
        shortcut={{ modifiers: [], key: "arrowRight" }}
        onAction={() => cmd(api.next)}
      />
      <MenuBarExtra.Item
        title="Previous Track"
        icon={Icon.Rewind}
        shortcut={{ modifiers: [], key: "arrowLeft" }}
        onAction={() => cmd(api.previous)}
      />

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title={`Shuffle: ${status?.shuffle ? "On" : "Off"}`}
        icon={Icon.Shuffle}
        onAction={() => cmd(api.shuffle)}
      />
      <MenuBarExtra.Item
        title={`Repeat: ${status?.repeat ?? "all"}`}
        icon={Icon.Repeat}
        onAction={() => cmd(api.repeat)}
      />

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={refresh}
      />
    </MenuBarExtra>
  );
}
