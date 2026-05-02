import { Icon, MenuBarExtra, open, openCommandPreferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import { fetchMusicState, type MusicState } from "./lib/applescript";
import { readNowPlaying, type NowPlaying } from "./lib/nowplaying";
import { resolveFormatLine } from "./lib/format-display";
import {
  ensureInstalled,
  status as daemonStatus,
  type DaemonStatus,
} from "./lib/daemon";
import { getCurrentFormat, type CurrentFormat } from "./lib/audio-format";
import { MENUBAR_HEARTBEAT_PATH, NOWPLAYING_PATH } from "./lib/paths";

interface BarVM {
  title: string;
  subtitle: string;
  music: MusicState;
  np: NowPlaying | null;
  daemon: DaemonStatus;
  current: CurrentFormat | null;
}

export default function MenuBar() {
  // Cached state so the previous title shows instantly on each refresh
  // (Raycast remounts the command on interval and click). Combined with
  // isLoading=true below, Raycast keeps the command alive until our async
  // fetch updates the cache with the latest values.
  const [vm, setVm] = useCachedState<BarVM | null>("menu-bar-vm", null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Heartbeat: signals to the Swift daemon that the menu-bar command is
    // active and may be refreshed via deeplink. Without this, firing the
    // background deeplink before activation triggers a Raycast error toast.
    try {
      fs.mkdirSync(path.dirname(MENUBAR_HEARTBEAT_PATH), { recursive: true });
      fs.writeFileSync(MENUBAR_HEARTBEAT_PATH, String(Date.now()));
    } catch {
      // best-effort; daemon falls back to its polling interval
    }

    let cancelled = false;
    (async () => {
      try {
        try {
          await ensureInstalled();
        } catch {
          // tolerate — show offline state
        }
        const [music, np, daemon, current] = await Promise.all([
          fetchMusicState(),
          readNowPlaying(NOWPLAYING_PATH),
          daemonStatus(),
          getCurrentFormat(),
        ]);
        if (cancelled) return;
        const playing = music.state === "playing" || music.state === "paused";
        const title =
          playing && np?.sampleRate
            ? rateLabel(np.sampleRate)
            : current
              ? (current.label.split(" · ")[1] ?? "")
              : "";
        const subtitle = playing
          ? resolveFormatLine(music, np)
          : current
            ? current.label
            : "Idle";
        setVm({ title, subtitle, music, np, daemon, current });
      } catch {
        // Any failure in the parallel fetch — keep the cached title visible
        // and let the next interval try again.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Default to Music icon while loading or running; only show Dot when
  // daemon is explicitly stopped.
  const icon = vm?.daemon === "stopped" ? Icon.Dot : Icon.Music;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={vm?.title ?? ""}
      icon={icon}
      tooltip={vm?.subtitle ?? "Loading…"}
    >
      <MenuBarExtra.Section title={vm?.music.name || "Not playing"}>
        {vm?.music.artist && <MenuBarExtra.Item title={vm.music.artist} />}
        <MenuBarExtra.Item title={vm?.subtitle ?? ""} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Now Playing"
          icon={Icon.Eye}
          onAction={() =>
            open(
              "raycast://extensions/lab_konversi/lossless-switcher/now-playing",
            )
          }
        />
        <MenuBarExtra.Item
          title="Switch Audio Format"
          icon={Icon.Switch}
          onAction={() =>
            open(
              "raycast://extensions/lab_konversi/lossless-switcher/switch-format",
            )
          }
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Refresh Interval…"
          icon={Icon.Gear}
          onAction={() => openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function rateLabel(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
}
