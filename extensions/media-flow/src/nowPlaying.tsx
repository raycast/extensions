import {
  Clipboard,
  Icon,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  launchCommand,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { getDevices, setDefaultOutput } from "./audio/devices";
import { getSystemVolume, setSystemVolume } from "./audio/volume";
import {
  controlSource,
  getMediaSources,
  stabilizeOrder,
  type MediaSnapshot,
} from "./core/mediaService";
import { registerAllProviders } from "./core/setup";
import type { MediaSource } from "./core/types";
import { execSafe } from "./lib/exec";
import { formatTime, truncate } from "./lib/format";

registerAllProviders();

interface Prefs {
  menuBarStyle: "iconAndTitle" | "iconOnly";
  showWhenStopped: boolean;
  maxTitleLength: string;
}

const PIN_KEY = "pinnedSourceId";
const TITLE_HIDDEN_KEY = "menuBarTitleHidden";
const VOLUME_STEPS = [0, 25, 50, 75, 100];
// Long enough to shrink the window where a native-menu rebuild can land a click on a
// shifted row, short enough to still feel live while the menu is open.
const OPEN_MENU_POLL_MS = 10000;

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const maxLen = Number(prefs.maxTitleLength) || 30;
  const orderRef = useRef<string[]>([]);

  const { data, isLoading, revalidate } = usePromise(async () => {
    const [pinnedId, titleHiddenValue] = await Promise.all([
      LocalStorage.getItem<string>(PIN_KEY),
      LocalStorage.getItem<string>(TITLE_HIDDEN_KEY),
    ]);
    const [snapshot, devices, volume] = await Promise.all([
      getMediaSources(pinnedId ?? undefined),
      getDevices(),
      getSystemVolume(),
    ]);
    const sources = stabilizeOrder(orderRef.current, snapshot.sources);
    orderRef.current = sources.map((s) => s.id);
    const titleHidden = titleHiddenValue === "true";
    return {
      snapshot: { ...snapshot, sources },
      devices,
      volume,
      pinnedId,
      titleHidden,
      at: new Date(),
    };
  });

  // Live update while the menu is open; process is unloaded when it closes.
  // Background-refresh launches must not keep the process alive with a timer, or the
  // refresh cycle can wedge and the menu-bar title goes stale.
  useEffect(() => {
    if (environment.launchType === LaunchType.Background) return;
    const t = setInterval(() => revalidate(), OPEN_MENU_POLL_MS);
    return () => clearInterval(t);
  }, [revalidate]);

  const playing = data?.snapshot.sources.find((s) => s.isPlaying);
  const title =
    prefs.menuBarStyle === "iconAndTitle" && !data?.titleHidden && playing
      ? truncate(
          `${playing.title} – ${playing.artist ?? playing.appName}`,
          maxLen,
        )
      : undefined;

  if (!playing && !prefs.showWhenStopped && !isLoading) return null;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={playing?.artworkPath ? { source: playing.artworkPath } : Icon.Music}
      title={title}
      tooltip={
        playing
          ? `${playing.title} — ${playing.artist ?? ""} — ${playing.appName}`
          : "MediaFlow"
      }
    >
      {data && <Menu {...data} maxLen={maxLen} onAction={revalidate} />}
    </MenuBarExtra>
  );
}

function Menu(props: {
  snapshot: MediaSnapshot;
  devices: Awaited<ReturnType<typeof getDevices>>;
  volume: number | null;
  pinnedId: string | undefined;
  titleHidden: boolean;
  at: Date;
  maxLen: number;
  onAction: () => void;
}) {
  const {
    snapshot,
    devices,
    volume,
    pinnedId,
    titleHidden,
    at,
    maxLen,
    onAction,
  } = props;
  const outputs = devices.filter((d) => d.kind === "output");

  return (
    <>
      <MenuBarExtra.Section title="Now Playing">
        {snapshot.sources.length === 0 && (
          <>
            <MenuBarExtra.Item
              title="Nothing playing"
              icon={Icon.SpeakerOff}
              subtitle={
                snapshot.engineAvailable
                  ? undefined
                  : "brew install media-control for full coverage"
              }
            />
            <MenuBarExtra.Item
              title="Open Music"
              icon={Icon.Music}
              onAction={() => void execSafe("open", ["-b", "com.apple.Music"])}
            />
            <MenuBarExtra.Item
              title="Open Spotify"
              icon={Icon.Music}
              onAction={() =>
                void execSafe("open", ["-b", "com.spotify.client"])
              }
            />
          </>
        )}
        {snapshot.sources.map((s) => (
          <SourceItems
            key={s.id}
            source={s}
            pinned={pinnedId === s.id}
            maxLen={maxLen}
            onAction={onAction}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Audio">
        <MenuBarExtra.Submenu
          title={`Output: ${outputs.find((d) => d.isDefault)?.name ?? "Unknown"}`}
          icon={Icon.Speaker}
        >
          {outputs.map((d) => (
            <MenuBarExtra.Item
              key={d.id}
              title={d.name}
              icon={
                d.isDefault
                  ? Icon.CheckCircle
                  : d.isWireless
                    ? Icon.Bluetooth
                    : Icon.Plug
              }
              onAction={async () => {
                await setDefaultOutput(d.id);
                onAction();
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Submenu
          title={`Volume: ${volume ?? "–"}%`}
          icon={
            volume !== null ? getProgressIcon(volume / 100) : Icon.SpeakerOff
          }
        >
          {/* cmd+arrowUp/Down aren't in @raycast/eslint-plugin's reserved-shortcut list, so they're safe here. */}
          <MenuBarExtra.Item
            title="Louder"
            icon={Icon.SpeakerUp}
            shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
            onAction={async () => {
              await setSystemVolume((volume ?? 0) + 10);
              onAction();
            }}
          />
          <MenuBarExtra.Item
            title="Quieter"
            icon={Icon.SpeakerDown}
            shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
            onAction={async () => {
              await setSystemVolume((volume ?? 0) - 10);
              onAction();
            }}
          />
          {VOLUME_STEPS.map((v) => (
            <MenuBarExtra.Item
              key={v}
              title={v === 0 ? "Mute" : `${v}%`}
              icon={
                volume !== null && Math.abs(volume - v) < 13
                  ? Icon.CheckCircle
                  : undefined
              }
              onAction={async () => {
                await setSystemVolume(v);
                onAction();
              }}
            />
          ))}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Details…"
          icon={Icon.AppWindowSidebarLeft}
          onAction={() =>
            launchCommand({
              name: "mediaDetails",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title={
            titleHidden ? "Show Title in Menu Bar" : "Hide Title in Menu Bar"
          }
          icon={titleHidden ? Icon.Eye : Icon.EyeDisabled}
          onAction={async () => {
            if (titleHidden) await LocalStorage.removeItem(TITLE_HIDDEN_KEY);
            else await LocalStorage.setItem(TITLE_HIDDEN_KEY, "true");
            onAction();
          }}
        />
        <MenuBarExtra.Item
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={() => openExtensionPreferences()}
        />
        <MenuBarExtra.Item
          title={`Updated ${at.toLocaleTimeString()}`}
          icon={Icon.Clock}
          onAction={onAction}
        />
      </MenuBarExtra.Section>
    </>
  );
}

/** Best-effort app launch for a source with no URL: open by bundle id, else by app name. */
function openSource(s: MediaSource): void {
  if (s.url) {
    void open(s.url);
  } else if (s.bundleId) {
    void execSafe("open", ["-b", s.bundleId]);
  } else {
    void execSafe("open", ["-a", s.appName]);
  }
}

function SourceItems(props: {
  source: MediaSource;
  pinned: boolean;
  maxLen: number;
  onAction: () => void;
}) {
  const { source: s, pinned, maxLen, onAction } = props;
  const progress =
    s.duration && s.position !== undefined
      ? Math.min(1, s.position / s.duration)
      : undefined;
  const timing = s.duration
    ? `${formatTime(s.position)} / ${formatTime(s.duration)}`
    : undefined;

  return (
    <>
      <MenuBarExtra.Item
        title={truncate(
          `${s.title}${s.artist ? ` — ${s.artist}` : ""}`,
          maxLen + 20,
        )}
        subtitle={[s.appName, timing].filter(Boolean).join(" • ")}
        icon={
          s.artworkPath
            ? { source: s.artworkPath }
            : progress !== undefined
              ? getProgressIcon(progress)
              : Icon.Music
        }
        tooltip={`${s.title} — ${s.artist ?? ""} (${s.appName})`}
        onAction={() => openSource(s)}
      />
      <MenuBarExtra.Item
        title={s.isPlaying ? "Pause" : "Play"}
        icon={s.isPlaying ? Icon.Pause : Icon.Play}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={async () => {
          await controlSource(s, "playpause");
          onAction();
        }}
      />
      <MenuBarExtra.Item
        title="Next Track"
        icon={Icon.Forward}
        alternate={
          <MenuBarExtra.Item
            title="Previous Track"
            icon={Icon.Rewind}
            onAction={async () => {
              await controlSource(s, "previous");
              onAction();
            }}
          />
        }
        onAction={async () => {
          await controlSource(s, "next");
          onAction();
        }}
      />
      <MenuBarExtra.Submenu title="More" icon={Icon.Ellipsis}>
        <MenuBarExtra.Item
          title={`Copy "${truncate(s.title, 25)} — ${s.artist ?? ""}"`}
          icon={Icon.Clipboard}
          onAction={async () => {
            await Clipboard.copy(`${s.title} — ${s.artist ?? ""}`);
          }}
        />
        {s.url && (
          <MenuBarExtra.Item
            title="Copy URL"
            icon={Icon.Link}
            onAction={async () => {
              await Clipboard.copy(s.url as string);
            }}
          />
        )}
        <MenuBarExtra.Item
          title={pinned ? "Unpin" : "Pin to Top"}
          icon={pinned ? Icon.PinDisabled : Icon.Pin}
          onAction={async () => {
            if (pinned) await LocalStorage.removeItem(PIN_KEY);
            else await LocalStorage.setItem(PIN_KEY, s.id);
            onAction();
          }}
        />
      </MenuBarExtra.Submenu>
    </>
  );
}
