import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { stopExternalPlayback } from "./utils/audio-player";
import {
  clearNowPlaying,
  clearSpeedOverride,
  formatSpeed,
  getNowPlaying,
  getSpeedOverride,
  parseRateString,
  requestPlaybackStop,
  setSpeedOverride,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  type NowPlayingState,
} from "./utils/mimo-playback-state";
import { getMimoSettings } from "./utils/provider-settings";
import { openProviderSetupCommand } from "./utils/provider-setup-command";

export default function MenuBarStatus() {
  const [prefRate, setPrefRate] = useState(1);
  const [state, setState] = useState<NowPlayingState | null | undefined>(undefined);
  const [override, setOverride] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getNowPlaying(), getSpeedOverride(), getMimoSettings()])
      .then(([s, r, settings]) => {
        setState(s);
        setOverride(r);
        setPrefRate(parseRateString(settings.speechRate));
      })
      // Without this catch, a transient LocalStorage / preferences rejection
      // leaves `state` undefined and isLoading stuck true until the next
      // refresh interval. Coerce to null so the idle UI renders instead.
      .catch(() => setState(null));
  }, []);

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

  const refreshOverride = async () => setOverride(await getSpeedOverride());

  const handleStop = async () => {
    await requestPlaybackStop();
    stopExternalPlayback();
    await clearNowPlaying();
    setState((s) => (s ? { ...s, status: "idle" } : s));
    await showHUD("Playback stopped");
  };

  const handleSpeedUp = async () => {
    const current = (await getSpeedOverride()) ?? prefRate;
    if (current >= SPEED_MAX) {
      await showHUD(`Already at maximum speed (${formatSpeed(SPEED_MAX)})`);
      return;
    }
    const next = await setSpeedOverride(current + SPEED_STEP);
    setOverride(next);
    await showHUD(`Speed ${formatSpeed(next)}`);
  };

  const handleSpeedDown = async () => {
    const current = (await getSpeedOverride()) ?? prefRate;
    if (current <= SPEED_MIN) {
      await showHUD(`Already at minimum speed (${formatSpeed(SPEED_MIN)})`);
      return;
    }
    const next = await setSpeedOverride(current - SPEED_STEP);
    setOverride(next);
    await showHUD(`Speed ${formatSpeed(next)}`);
  };

  const handleResetSpeed = async () => {
    await clearSpeedOverride();
    setOverride(null);
    await showHUD(`Speed reset to default (${formatSpeed(prefRate)})`);
  };

  const launch = (name: string) => () =>
    launchCommand({ name, type: LaunchType.UserInitiated })
      .then(refreshOverride)
      .catch(() => undefined);

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading} tooltip="MiMo TTS Status">
      {isActive && state ? (
        <>
          <MenuBarExtra.Section title="Now Playing">
            <MenuBarExtra.Item
              title={`${state.voiceName} · ${state.modelLabel}`}
              icon={{ source: Icon.SpeakerHigh, tintColor: Color.Green }}
            />
            <MenuBarExtra.Item
              title={
                state.totalChunks > 1 && state.currentChunk >= 0
                  ? `Chunk ${state.currentChunk + 1} of ${state.totalChunks}`
                  : state.status === "synthesizing"
                    ? "Synthesizing first chunk…"
                    : "Playing"
              }
              subtitle={state.source ?? ""}
            />
            {state.textPreview ? <MenuBarExtra.Item title={`“${truncate(state.textPreview, 60)}”`} /> : null}
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
          title={`${formatSpeed(effectiveRate)}${override === null ? " (default)" : " (override)"}`}
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
        <MenuBarExtra.Item title="Open TTS Studio" icon={Icon.Microphone} onAction={launch("tts-studio")} />
        <MenuBarExtra.Item title="Read with Voice" icon={Icon.SpeakerHigh} onAction={launch("read-with-voice")} />
        <MenuBarExtra.Item title="Set Quick Read Voice" icon={Icon.Star} onAction={launch("select-voice")} />
        <MenuBarExtra.Item title="Setup Voice Defaults" icon={Icon.Gauge} onAction={openProviderSetupCommand} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}

function abbreviate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}
