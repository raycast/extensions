import {
  Clipboard,
  Color,
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
  getMediaSources,
  stabilizeOrder,
  waitForTrackChange,
  type MediaSnapshot,
} from "./core/mediaService";
import { registerAllProviders } from "./core/setup";
import type { MediaSource } from "./core/types";
import { execSafe } from "./lib/exec";
import { truncate } from "./lib/format";

registerAllProviders();

interface Prefs {
  menuBarStyle: "iconAndTitle" | "iconOnly";
  showWhenStopped: boolean;
  maxTitleLength: string;
}

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
    const titleHiddenValue =
      await LocalStorage.getItem<string>(TITLE_HIDDEN_KEY);
    const [snapshot, devices, volume] = await Promise.all([
      getMediaSources(),
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
      titleHidden,
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
      {data && <Menu {...data} onAction={revalidate} />}
    </MenuBarExtra>
  );
}

function Menu(props: {
  snapshot: MediaSnapshot;
  devices: Awaited<ReturnType<typeof getDevices>>;
  volume: number | null;
  titleHidden: boolean;
  onAction: () => void;
}) {
  const { snapshot, devices, volume, titleHidden, onAction } = props;
  const outputs = devices.filter((d) => d.kind === "output");

  // When something is playing, show only the playing source(s) so the dropdown matches
  // the menu-bar title and Copy is unambiguous. Fall back to every source only when
  // nothing is playing, so a paused source stays resumable.
  const playingSources = snapshot.sources.filter((s) => s.isPlaying);
  const shown =
    playingSources.length > 0 ? playingSources : snapshot.sources;

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
        {shown.map((s) => (
          <SourceItems key={s.id} source={s} onAction={onAction} />
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
            volume !== null
              ? getProgressIcon(volume / 100, Color.PrimaryText)
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
          title="Settings"
          icon={Icon.Gear}
          onAction={() => openExtensionPreferences()}
        />
      </MenuBarExtra.Section>
    </>
  );
}

/** Bring the source's app window to the front (activates the app). */
function focusSource(s: MediaSource): void {
  if (s.bundleId) void execSafe("open", ["-b", s.bundleId]);
  else void execSafe("open", ["-a", s.appName]);
}

function SourceItems(props: { source: MediaSource; onAction: () => void }) {
  const { source: s, onAction } = props;

  return (
    <>
      <MenuBarExtra.Item
        title="Open Player"
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
          await waitForTrackChange(s.title);
          onAction();
        }}
      />
      <MenuBarExtra.Item
        title="Previous Track"
        icon={Icon.Rewind}
        onAction={async () => {
          await controlSource(s, "previous");
          await waitForTrackChange(s.title);
          onAction();
        }}
      />
      <MenuBarExtra.Item
        title="Copy Song Name"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(`${s.title} — ${s.artist ?? ""}`);
        }}
      />
    </>
  );
}
