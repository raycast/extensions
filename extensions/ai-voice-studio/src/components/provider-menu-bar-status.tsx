import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { stopExternalPlayback } from "../utils/audio-player";
import { openProviderSetupCommand } from "../utils/provider-setup-command";
import type { NowPlayingState } from "../utils/shared-playback-state";

interface PlaybackStateApi {
  clearNowPlaying: () => Promise<void>;
  clearSpeedOverride: () => Promise<void>;
  formatSpeed: (rate: number) => string;
  getNowPlaying: () => Promise<NowPlayingState | null>;
  getSpeedOverride: () => Promise<number | null>;
  parseRateString: (value: string | undefined | null) => number;
  requestPlaybackStop: () => Promise<void>;
  setSpeedOverride: (rate: number) => Promise<number>;
  speedMax: number;
  speedMin: number;
  speedStep: number;
}

interface ProviderMenuAction {
  title: string;
  icon: Icon;
  commandName: string;
}

interface ProviderMenuBarStatusProps<Settings> {
  actions: ProviderMenuAction[];
  getSettings: () => Promise<Settings>;
  playback: PlaybackStateApi;
  rateSetting: (settings: Settings) => string | undefined | null;
  tooltip: string;
}

export function ProviderMenuBarStatus<Settings>({
  actions,
  getSettings,
  playback,
  rateSetting,
  tooltip,
}: ProviderMenuBarStatusProps<Settings>) {
  const [prefRate, setPrefRate] = useState(1);
  const [state, setState] = useState<NowPlayingState | null | undefined>(undefined);
  const [override, setOverride] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([playback.getNowPlaying(), playback.getSpeedOverride(), getSettings()])
      .then(([s, r, settings]) => {
        setState(s);
        setOverride(r);
        setPrefRate(playback.parseRateString(rateSetting(settings)));
      })
      .catch(() => setState(null));
  }, [getSettings, playback, rateSetting]);

  const isLoading = state === undefined;
  const status = state?.status ?? "idle";
  const isActive = status === "synthesizing" || status === "playing";
  const effectiveRate = override ?? prefRate;

  const icon = isActive
    ? { source: Icon.Play, tintColor: Color.Green }
    : status === "error"
      ? { source: Icon.ExclamationMark, tintColor: Color.Red }
      : { source: Icon.SpeakerHigh, tintColor: Color.SecondaryText };

  const title = isActive ? abbreviate(state!.voiceName, 14) : undefined;

  const refreshOverride = async () => setOverride(await playback.getSpeedOverride());

  const handleStop = async () => {
    await playback.requestPlaybackStop();
    stopExternalPlayback();
    await playback.clearNowPlaying();
    setState((s) => (s ? { ...s, status: "idle" } : s));
    await showHUD("Playback stopped");
  };

  const handleSpeedUp = async () => {
    const current = (await playback.getSpeedOverride()) ?? prefRate;
    if (current >= playback.speedMax) {
      await showHUD(`Already at maximum speed (${playback.formatSpeed(playback.speedMax)})`);
      return;
    }
    const next = await playback.setSpeedOverride(current + playback.speedStep);
    setOverride(next);
    await showHUD(`Speed ${playback.formatSpeed(next)}`);
  };

  const handleSpeedDown = async () => {
    const current = (await playback.getSpeedOverride()) ?? prefRate;
    if (current <= playback.speedMin) {
      await showHUD(`Already at minimum speed (${playback.formatSpeed(playback.speedMin)})`);
      return;
    }
    const next = await playback.setSpeedOverride(current - playback.speedStep);
    setOverride(next);
    await showHUD(`Speed ${playback.formatSpeed(next)}`);
  };

  const handleResetSpeed = async () => {
    await playback.clearSpeedOverride();
    setOverride(null);
    await showHUD(`Speed reset to default (${playback.formatSpeed(prefRate)})`);
  };

  const launch = (name: string) => () =>
    launchCommand({ name, type: LaunchType.UserInitiated })
      .then(refreshOverride)
      .catch(() => undefined);

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading} tooltip={tooltip}>
      {isActive && state ? (
        <>
          <MenuBarExtra.Section title="Now Playing">
            <MenuBarExtra.Item
              title={`${state.voiceName} · ${state.modelLabel}`}
              icon={{ source: Icon.SpeakerHigh, tintColor: Color.Green }}
            />
            <MenuBarExtra.Item title={formatPlaybackProgress(state)} subtitle={state.source ?? ""} />
            {state.textPreview ? <MenuBarExtra.Item title={`"${truncate(state.textPreview, 60)}"`} /> : null}
          </MenuBarExtra.Section>
          <MenuBarExtra.Item title="Stop Reading" icon={Icon.Stop} onAction={handleStop} />
        </>
      ) : (
        <MenuBarExtra.Section title="Status">
          <MenuBarExtra.Item
            title={status === "error" ? `Error: ${state?.errorMessage ?? "Unknown"}` : "Idle"}
            icon={status === "error" ? Icon.ExclamationMark : Icon.Pause}
          />
          {state && status !== "error" ? (
            <MenuBarExtra.Item title={`Last: ${state.voiceName} · ${truncate(state.textPreview, 40)}`} />
          ) : null}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title="Playback Speed">
        <MenuBarExtra.Item
          title={`${playback.formatSpeed(effectiveRate)}${override === null ? " (default)" : " (override)"}`}
          icon={Icon.Gauge}
        />
        <MenuBarExtra.Item
          title="Increase Speed (+0.25x)"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "=" }}
          onAction={handleSpeedUp}
        />
        <MenuBarExtra.Item
          title="Decrease Speed (-0.25x)"
          icon={Icon.Minus}
          shortcut={{ modifiers: ["cmd"], key: "-" }}
          onAction={handleSpeedDown}
        />
        {override !== null ? (
          <MenuBarExtra.Item title="Reset to Default Speed" icon={Icon.RotateClockwise} onAction={handleResetSpeed} />
        ) : null}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {actions.map((action) => (
          <MenuBarExtra.Item
            key={action.commandName}
            title={action.title}
            icon={action.icon}
            onAction={launch(action.commandName)}
          />
        ))}
        <MenuBarExtra.Item title="Setup Voice Defaults" icon={Icon.Gauge} onAction={openProviderSetupCommand} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function formatPlaybackProgress(state: NowPlayingState): string {
  if (state.totalChunks > 1 && state.currentChunk >= 0) {
    return `Chunk ${state.currentChunk + 1} of ${state.totalChunks}`;
  }
  return state.status === "synthesizing" ? "Synthesizing first chunk..." : "Playing";
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return `${s.slice(0, n)}...`;
}

function abbreviate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}...`;
}
