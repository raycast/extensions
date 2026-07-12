import {
  Clipboard,
  Icon,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { getDevices, setDefaultOutput } from "./audio/devices";
import { getSystemVolume, setSystemVolume } from "./audio/volume";
import {
  controlSource,
  focusSource,
  getMediaSources,
  goToPreviousTrack,
  stabilizeOrder,
  type MediaSnapshot,
} from "./core/mediaService";
import { registerAllProviders } from "./core/setup";
import type { MediaSource } from "./core/types";
import { execSafe } from "./lib/exec";
import { truncate } from "./lib/format";
import { streamNowPlaying } from "./lib/stream";

registerAllProviders();

interface Prefs {
  menuBarStyle: "iconAndTitle" | "iconOnly";
  showWhenStopped: boolean;
  maxTitleLength: string;
}

const TITLE_HIDDEN_KEY = "menuBarTitleHidden";
const LAST_PLAYER_KEY = "lastPlayer";

interface LastPlayer {
  appName: string;
  bundleId?: string;
}

function parseLastPlayer(raw: string | undefined): LastPlayer | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as LastPlayer;
    return typeof v?.appName === "string" ? v : undefined;
  } catch {
    return undefined;
  }
}

function openPlayer(player: LastPlayer): void {
  const args = player.bundleId
    ? ["-b", player.bundleId]
    : ["-a", player.appName];
  void execSafe("open", args);
}
const VOLUME_STEPS = [0, 25, 50, 75, 100];
// Long enough to shrink the window where a native-menu rebuild can land a click on a
// shifted row, short enough to still feel live while the menu is open.
const OPEN_MENU_POLL_MS = 10000;

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const maxLen = Number(prefs.maxTitleLength) || 30;
  const orderRef = useRef<string[]>([]);

  const { data, isLoading, revalidate } = usePromise(async () => {
    const [titleHiddenValue, storedLast] = await Promise.all([
      LocalStorage.getItem<string>(TITLE_HIDDEN_KEY),
      LocalStorage.getItem<string>(LAST_PLAYER_KEY),
    ]);
    const [snapshot, devices, volume] = await Promise.all([
      getMediaSources(),
      getDevices(),
      getSystemVolume(),
    ]);
    const sources = stabilizeOrder(orderRef.current, snapshot.sources);
    orderRef.current = sources.map((s) => s.id);
    const titleHidden = titleHiddenValue === "true";

    // Remember the most recent player so the empty state can offer to reopen it.
    // Prefer the playing source, else the first known source.
    let lastPlayer = parseLastPlayer(storedLast);
    const recent = sources.find((s) => s.isPlaying) ?? sources[0];
    if (recent) {
      lastPlayer = { appName: recent.appName, bundleId: recent.bundleId };
      await LocalStorage.setItem(LAST_PLAYER_KEY, JSON.stringify(lastPlayer));
    }

    return {
      snapshot: { ...snapshot, sources },
      devices,
      volume,
      titleHidden,
      lastPlayer,
    };
  });

  // Live update while the menu is open; process is unloaded when it closes.
  // Background-refresh launches must not keep the process alive with a timer/stream, or the
  // refresh cycle can wedge and the menu-bar title goes stale.
  //
  // With the engine available we refresh on media-control's push events (no polling): a
  // track/play-pause change emits an update and we re-read the merged snapshot straight away,
  // so next/previous land instantly instead of waiting out a poll. Without the engine there
  // is no event source (AppleScript-only providers), so fall back to periodic polling.
  const engineAvailable = data?.snapshot.engineAvailable ?? false;
  useEffect(() => {
    if (environment.launchType === LaunchType.Background) return;
    if (!engineAvailable) {
      const t = setInterval(() => revalidate(), OPEN_MENU_POLL_MS);
      return () => clearInterval(t);
    }
    let poll: ReturnType<typeof setInterval> | undefined;
    const handle = streamNowPlaying(
      () => revalidate(),
      () => {
        // Stream died unexpectedly — degrade to polling so the menu still updates.
        if (!poll) poll = setInterval(() => revalidate(), OPEN_MENU_POLL_MS);
      },
    );
    return () => {
      handle.stop();
      if (poll) clearInterval(poll);
    };
  }, [revalidate, engineAvailable]);

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
      {data && <Menu {...data} onAction={revalidate} />}
    </MenuBarExtra>
  );
}

function Menu(props: {
  snapshot: MediaSnapshot;
  devices: Awaited<ReturnType<typeof getDevices>>;
  volume: number | null;
  titleHidden: boolean;
  lastPlayer: LastPlayer | undefined;
  onAction: () => void;
}) {
  const { snapshot, devices, volume, titleHidden, lastPlayer, onAction } = props;
  const outputs = devices.filter((d) => d.kind === "output");

  // When something is playing, show only the playing source(s) so the dropdown matches
  // the menu-bar title and Copy is unambiguous. Fall back to every source only when
  // nothing is playing, so a paused source stays resumable.
  const playingSources = snapshot.sources.filter((s) => s.isPlaying);
  const shown = playingSources.length > 0 ? playingSources : snapshot.sources;

  return (
    <>
      {shown.length <= 1 ? (
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
              {lastPlayer ? (
                <MenuBarExtra.Item
                  title={`Open ${lastPlayer.appName}`}
                  icon={Icon.Music}
                  onAction={() => openPlayer(lastPlayer)}
                />
              ) : (
                <>
                  <MenuBarExtra.Item
                    title="Open Apple Music"
                    icon={Icon.Music}
                    onAction={() =>
                      openPlayer({
                        appName: "Apple Music",
                        bundleId: "com.apple.Music",
                      })
                    }
                  />
                  <MenuBarExtra.Item
                    title="Open Spotify"
                    icon={Icon.Music}
                    onAction={() =>
                      openPlayer({
                        appName: "Spotify",
                        bundleId: "com.spotify.client",
                      })
                    }
                  />
                </>
              )}
            </>
          )}
          {shown.map((s) => (
            <SourceItems key={s.id} source={s} onAction={onAction} />
          ))}
        </MenuBarExtra.Section>
      ) : (
        // Multiple sources playing at once: give each its own labeled section so the
        // controls and Copy are unambiguous.
        shown.map((s) => (
          <MenuBarExtra.Section
            key={s.id}
            title={`${s.title}${s.artist ? ` — ${s.artist}` : ""}`}
          >
            <SourceItems source={s} onAction={onAction} />
          </MenuBarExtra.Section>
        ))
      )}

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
            volume !== null
              ? getProgressIcon(volume / 100, "#FFFFFF")
              : Icon.SpeakerOff
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
          title={titleHidden ? "Show Title" : "Hide Title"}
          icon={titleHidden ? Icon.Eye : Icon.EyeDisabled}
          onAction={async () => {
            if (titleHidden) await LocalStorage.removeItem(TITLE_HIDDEN_KEY);
            else await LocalStorage.setItem(TITLE_HIDDEN_KEY, "true");
            onAction();
          }}
        />
        <MenuBarExtra.Item
          title="Settings"
          icon={Icon.Gear}
          onAction={() => openExtensionPreferences()}
        />
      </MenuBarExtra.Section>
    </>
  );
}

function SourceItems(props: { source: MediaSource; onAction: () => void }) {
  const { source: s, onAction } = props;

  return (
    <>
      <MenuBarExtra.Item
        title={`Open ${s.appName}`}
        icon={Icon.AppWindow}
        onAction={() => focusSource(s)}
      />
      <MenuBarExtra.Item
        title="Play/Pause"
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
        onAction={async () => {
          await controlSource(s, "next");
          // No wait needed: the media-control stream pushes the new track and refreshes
          // the menu as soon as the player switches.
          onAction();
        }}
      />
      <MenuBarExtra.Item
        title="Previous Track"
        icon={Icon.Rewind}
        onAction={async () => {
          await goToPreviousTrack(s);
          onAction();
        }}
      />
      <MenuBarExtra.Item
        title="Copy Song Name"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(s.artist ? `${s.title} — ${s.artist}` : s.title);
        }}
      />
    </>
  );
}
