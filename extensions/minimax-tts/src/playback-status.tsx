import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { stopExternalPlayback } from "./utils/audio-player";
import { clearPlaybackState, readPlaybackState, type PlaybackState } from "./utils/playback-state";
import { getLastReadingSession, type ReadingSession } from "./utils/reading-session";
import { formatSpeed, readPlaybackSpeed, SPEED_MAX, SPEED_MIN } from "./utils/playback-speed";

interface Snapshot {
  live: PlaybackState | null;
  session: ReadingSession | null;
  speed: number | null;
  loading: boolean;
}

export default function PlaybackStatus() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ live: null, session: null, speed: null, loading: true });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [live, session, speed] = await Promise.all([
        readPlaybackState(),
        getLastReadingSession(),
        readPlaybackSpeed(),
      ]);
      if (!mounted) return;
      setSnapshot({ live, session, speed, loading: false });
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const { live, session, speed, loading } = snapshot;
  const effectiveSpeed = resolveEffectiveSpeed(live, session, speed);
  const display = describeMenubar(live, session, effectiveSpeed);

  // Hide the menubar entirely when there's nothing meaningful to show.
  if (!loading && !display) {
    return null;
  }

  const isLive = !!live && (live.phase === "synthesizing" || live.phase === "playing");
  const hasPausedSession = !live && isPausedSession(session);
  const canAdjustSpeed = isLive || live?.phase === "stopped" || hasPausedSession;
  const canSpeedUp = canAdjustSpeed && effectiveSpeed < SPEED_MAX;
  const canSlowDown = canAdjustSpeed && effectiveSpeed > SPEED_MIN;

  return (
    <MenuBarExtra
      isLoading={loading}
      icon={display?.icon || Icon.SpeakerOn}
      title={display?.title}
      tooltip={display?.tooltip}
    >
      {live && (
        <MenuBarExtra.Section title="Now Reading">
          <MenuBarExtra.Item title={live.textPreview || "MiniMax TTS"} subtitle={describePhase(live)} />
          <MenuBarExtra.Item title={`Voice: ${live.voiceId}`} />
          <MenuBarExtra.Item title={`Source: ${live.source}`} subtitle={`${live.totalChars} chars`} />
        </MenuBarExtra.Section>
      )}

      {!live && session && session.nextChunkIndex < session.chunks.length && (
        <MenuBarExtra.Section title="Last Reading">
          <MenuBarExtra.Item
            title={truncate(session.text, 60) || "MiniMax TTS"}
            subtitle={`Paused at ${session.nextChunkIndex + 1}/${session.chunks.length}`}
          />
          <MenuBarExtra.Item title={`Voice: ${session.options.voiceId}`} />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section title={`Speed · ${formatSpeed(effectiveSpeed)}`}>
        <MenuBarExtra.Item
          title="Speed Up (+0.25×)"
          icon={Icon.Plus}
          onAction={canSpeedUp ? handleSpeedUp : handleSpeedUnavailable}
        />
        <MenuBarExtra.Item
          title="Slow Down (-0.25×)"
          icon={Icon.Minus}
          onAction={canSlowDown ? handleSlowDown : handleSpeedUnavailable}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Controls">
        {(live?.phase === "synthesizing" || live?.phase === "playing") && (
          <MenuBarExtra.Item title="Stop" icon={Icon.Stop} onAction={handleStop} />
        )}
        {(session || live?.phase === "stopped") && (
          <MenuBarExtra.Item title="Resume Last Reading" icon={Icon.Play} onAction={handleResume} />
        )}
        {session && (
          <MenuBarExtra.Item title="Restart Last Reading" icon={Icon.RotateClockwise} onAction={handleRestart} />
        )}
        <MenuBarExtra.Item title="Read Selected Text…" icon={Icon.Microphone} onAction={handleQuickRead} />
        <MenuBarExtra.Item title="Pick Voice…" icon={Icon.Star} onAction={handleSelectVoice} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

interface MenuDisplay {
  title: string;
  icon: { source: Icon; tintColor?: Color } | Icon;
  tooltip: string;
}

function resolveEffectiveSpeed(
  live: PlaybackState | null,
  session: ReadingSession | null,
  speed: number | null,
): number {
  if (live && typeof speed === "number") return speed;
  if (live && typeof live.speed === "number") return live.speed;
  if (session && typeof session.options.speed === "number") return session.options.speed;
  if (typeof speed === "number") return speed;
  return 1;
}

function isPausedSession(session: ReadingSession | null): session is ReadingSession {
  return !!session && session.nextChunkIndex > 0 && session.nextChunkIndex < session.chunks.length;
}

function describeMenubar(
  live: PlaybackState | null,
  session: ReadingSession | null,
  speed: number,
): MenuDisplay | null {
  const speedSuffix = speed === 1 ? "" : ` · ${formatSpeed(speed)}`;

  if (live && (live.phase === "synthesizing" || live.phase === "playing")) {
    const verb = live.phase === "synthesizing" ? "Synth" : "Play";
    return {
      title: `${verb} ${live.chunkIndex + 1}/${live.chunkTotal}${speedSuffix}`,
      icon: { source: Icon.SpeakerOn, tintColor: live.phase === "synthesizing" ? Color.Orange : Color.Blue },
      tooltip: `MiniMax TTS · ${verb} chunk ${live.chunkIndex + 1}/${live.chunkTotal} at ${formatSpeed(speed)}`,
    };
  }

  if (live && live.phase === "stopped") {
    return {
      title: `Paused ${live.chunkIndex + 1}/${live.chunkTotal}${speedSuffix}`,
      icon: { source: Icon.Pause, tintColor: Color.SecondaryText },
      tooltip: `MiniMax TTS · paused at ${formatSpeed(speed)}. Click to resume.`,
    };
  }

  if (session && session.nextChunkIndex > 0 && session.nextChunkIndex < session.chunks.length) {
    return {
      title: `Paused ${session.nextChunkIndex + 1}/${session.chunks.length}${speedSuffix}`,
      icon: { source: Icon.Pause, tintColor: Color.SecondaryText },
      tooltip: `MiniMax TTS · last reading paused at ${formatSpeed(speed)}. Click to resume.`,
    };
  }

  return null;
}

function describePhase(state: PlaybackState): string {
  const total = state.chunkTotal;
  const idx = state.chunkIndex + 1;
  switch (state.phase) {
    case "synthesizing":
      return `Synthesizing ${idx}/${total}`;
    case "playing":
      return `Playing ${idx}/${total}`;
    case "stopped":
      return `Paused ${idx}/${total}`;
    case "completed":
      return `Completed ${total}/${total}`;
  }
}

function truncate(text: string, max: number): string {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  if (chars.length <= max) return chars.join("");
  return chars.slice(0, max).join("") + "…";
}

async function handleStop() {
  const stopped = stopExternalPlayback();
  await clearPlaybackState();
  await showHUD(stopped ? "Playback stopped" : "No active playback");
}

async function handleResume() {
  await launchCommand({ name: "resume-reading", type: LaunchType.UserInitiated });
}

async function handleRestart() {
  await launchCommand({ name: "restart-reading", type: LaunchType.UserInitiated });
}

async function handleQuickRead() {
  await launchCommand({ name: "quick-read", type: LaunchType.UserInitiated });
}

async function handleSelectVoice() {
  await launchCommand({ name: "select-voice", type: LaunchType.UserInitiated });
}

async function handleSpeedUp() {
  await launchCommand({ name: "speed-up-reading", type: LaunchType.UserInitiated });
}

async function handleSlowDown() {
  await launchCommand({ name: "slow-down-reading", type: LaunchType.UserInitiated });
}

async function handleSpeedUnavailable() {
  await showHUD("No active reading. Open Preferences to change the default speed.");
}
