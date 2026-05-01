import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Toast,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { fetchMusicState, type MusicState } from "./lib/applescript";
import { readNowPlaying, type NowPlaying } from "./lib/nowplaying";
import { resolveFormatLine } from "./lib/format-display";
import { fetchArtwork } from "./lib/artwork";
import { getCurrentFormat, type CurrentFormat } from "./lib/audio-format";
import {
  status as daemonStatus,
  ensureInstalled,
  start as daemonStart,
  stop as daemonStop,
  type DaemonStatus,
} from "./lib/daemon";
import { isFlagSet, toggleFlag } from "./lib/flags";
import { AUTOAPPLY_OFF_FLAG, NOWPLAYING_PATH } from "./lib/paths";

interface ViewModel {
  music: MusicState;
  np: NowPlaying | null;
  formatLine: string;
  daemon: DaemonStatus;
  autoFollow: boolean;
  artwork: string | null;
  device: CurrentFormat | null;
}

const POLL_MS = 2000;
const SWITCH_FORMAT_DEEPLINK =
  "raycast://extensions/lab_konversi/lossless-switcher/switch-format";

export default function NowPlaying() {
  // Cached state: previous render shows immediately on mount. The 2s
  // polling tick refreshes it with live data shortly after.
  const [vm, setVm] = useCachedState<ViewModel | null>("now-playing-vm", null);
  const [loading, setLoading] = useState(true);
  const artworkRef = useRef<{ key: string; path: string | null }>({
    key: "",
    path: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        await ensureInstalled();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Daemon setup failed",
          message: (err as Error).message,
        });
      }
      const [music, np, daemon, autoOff, device] = await Promise.all([
        fetchMusicState(),
        readNowPlaying(NOWPLAYING_PATH),
        daemonStatus(),
        isFlagSet(AUTOAPPLY_OFF_FLAG),
        getCurrentFormat(),
      ]);
      const formatLine = resolveFormatLine(music, np);

      const newKey = `${music.artist}|${music.name}`;
      if (newKey !== artworkRef.current.key && music.name) {
        const path = await fetchArtwork(music.artist, music.name);
        artworkRef.current = { key: newKey, path };
      }

      if (cancelled) return;
      const next: ViewModel = {
        music,
        np,
        formatLine,
        daemon,
        autoFollow: !autoOff,
        artwork: artworkRef.current.path,
        device,
      };
      setVm((prev) => (vmEqual(prev, next) ? prev : next));
      setLoading(false);
    }

    let timer: NodeJS.Timeout | null = null;

    async function loop() {
      if (cancelled) return;
      await tick();
      if (cancelled) return;
      timer = setTimeout(loop, POLL_MS);
    }

    loop();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const playing = vm?.music.state === "playing" || vm?.music.state === "paused";
  const showMetadata = !!vm && playing && vm.daemon !== "not-installed";

  return (
    <Detail
      isLoading={loading}
      markdown={vm ? buildMarkdown(vm) : "Loading…"}
      metadata={showMetadata && vm ? <Metadata vm={vm} /> : undefined}
      actions={vm ? <Actions vm={vm} /> : undefined}
    />
  );
}

function buildMarkdown(vm: ViewModel): string {
  const { music, daemon, artwork } = vm;

  if (music.state === "not-running") {
    return "# Apple Music is not running\n\nOpen Apple Music and start playback to see the live audio format.";
  }
  if (music.state === "stopped" || music.state === "no-track") {
    return "# Music is stopped\n\nStart a track to see the live audio format.";
  }
  if (daemon === "not-installed") {
    return "# Setting up daemon…\n\nFirst-run install in progress. This takes a few seconds.";
  }

  // Active playback: render artwork only — track metadata moves to the sidebar.
  if (artwork) {
    return `![](file://${artwork}?raycast-width=360&raycast-height=360)`;
  }
  // Fallback when no artwork is found.
  return `# ${music.name || "Unknown title"}\n\n${music.artist}${music.album ? `\n\n*${music.album}*` : ""}`;
}

function Metadata({ vm }: { vm: ViewModel }) {
  const codec = codecLabel(vm.np?.format ?? "");
  const rendition = vm.np?.rendition?.trim() ?? "";

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Track" text={vm.music.name || "—"} />
      <Detail.Metadata.Label title="Artist" text={vm.music.artist || "—"} />
      <Detail.Metadata.Label title="Album" text={vm.music.album || "—"} />
      <Detail.Metadata.Separator />
      {vm.np?.sampleRate ? (
        <Detail.Metadata.Label
          title="Sample Rate"
          text={rateLabel(vm.np.sampleRate)}
        />
      ) : (
        <Detail.Metadata.Label title="Sample Rate" text="—" />
      )}
      {vm.np?.bitDepth && vm.np.bitDepth > 0 ? (
        <Detail.Metadata.Label
          title="Bit Depth"
          text={`${vm.np.bitDepth}-bit`}
        />
      ) : null}
      {codec || rendition ? (
        <Detail.Metadata.TagList title="Quality">
          {codec ? (
            <Detail.Metadata.TagList.Item
              text={codec}
              color={codecColor(codec)}
            />
          ) : null}
          {rendition ? (
            <Detail.Metadata.TagList.Item
              text={rendition}
              color={renditionColor(rendition)}
            />
          ) : null}
        </Detail.Metadata.TagList>
      ) : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Output Device"
        text={vm.device?.device ?? "—"}
      />
      <Detail.Metadata.Label
        title="Device Format"
        text={vm.device?.label ?? "—"}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Daemon">
        <Detail.Metadata.TagList.Item
          text={daemonText(vm.daemon)}
          color={daemonColor(vm.daemon)}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.TagList title="Auto-Follow">
        <Detail.Metadata.TagList.Item
          text={vm.autoFollow ? "ON" : "OFF"}
          color={vm.autoFollow ? Color.Green : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}

function rateLabel(hz: number): string {
  const khz = hz / 1000;
  return Number.isInteger(khz) ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
}

function vmEqual(a: ViewModel | null, b: ViewModel): boolean {
  if (!a) return false;
  return (
    a.music.state === b.music.state &&
    a.music.name === b.music.name &&
    a.music.artist === b.music.artist &&
    a.music.album === b.music.album &&
    a.music.kind === b.music.kind &&
    a.music.trackClass === b.music.trackClass &&
    a.music.sampleRate === b.music.sampleRate &&
    a.music.bitRate === b.music.bitRate &&
    a.np?.format === b.np?.format &&
    a.np?.sampleRate === b.np?.sampleRate &&
    a.np?.bitDepth === b.np?.bitDepth &&
    a.np?.rendition === b.np?.rendition &&
    a.formatLine === b.formatLine &&
    a.daemon === b.daemon &&
    a.autoFollow === b.autoFollow &&
    a.artwork === b.artwork &&
    a.device?.device === b.device?.device &&
    a.device?.label === b.device?.label
  );
}

function codecLabel(format: string): string {
  switch (format.toLowerCase()) {
    case "qlac":
    case "alac":
      return "ALAC";
    case "qaac":
    case "aac":
    case "aach":
    case "aacp":
      return "AAC";
    case "lpcm":
    case "pcm":
      return "PCM";
    case "flac":
      return "FLAC";
    default:
      return format ? format.toUpperCase() : "";
  }
}

function codecColor(codec: string): Color {
  switch (codec) {
    case "ALAC":
    case "FLAC":
    case "PCM":
      return Color.Green;
    case "AAC":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

function renditionColor(rendition: string): Color {
  if (rendition.includes("Hi-Res")) return Color.Purple;
  if (rendition.includes("Atmos")) return Color.Magenta;
  if (rendition.includes("Lossless")) return Color.Blue;
  return Color.SecondaryText;
}

function daemonText(s: DaemonStatus): string {
  return s === "running"
    ? "Running"
    : s === "stopped"
      ? "Stopped"
      : "Not Installed";
}

function daemonColor(s: DaemonStatus): Color {
  return s === "running"
    ? Color.Green
    : s === "stopped"
      ? Color.Red
      : Color.SecondaryText;
}

function Actions({ vm }: { vm: ViewModel }) {
  return (
    <ActionPanel>
      <Action
        title="Switch Audio Format"
        icon={Icon.Switch}
        onAction={() => open(SWITCH_FORMAT_DEEPLINK)}
      />
      <Action
        title={vm.autoFollow ? "Disable Auto-follow" : "Enable Auto-follow"}
        icon={Icon.Repeat}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={async () => {
          const set = await toggleFlag(AUTOAPPLY_OFF_FLAG);
          await showHUD(set ? "Auto-follow OFF" : "Auto-follow ON");
        }}
      />
      <Action.CopyToClipboard
        title="Copy Format Summary"
        content={`${vm.music.name} — ${vm.music.artist} (${vm.formatLine})`}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      {vm.daemon === "stopped" && (
        <Action
          title="Start Daemon"
          icon={Icon.Play}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={async () => {
            await daemonStart();
            await showHUD("Daemon started");
          }}
        />
      )}
      {vm.daemon === "running" && (
        <Action
          title="Stop Daemon"
          icon={Icon.Stop}
          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          onAction={async () => {
            await daemonStop();
            await showHUD("Daemon stopped");
          }}
        />
      )}
      <Action.Open
        title="Open Apple Music"
        icon={Icon.Music}
        target="/System/Applications/Music.app"
      />
    </ActionPanel>
  );
}
