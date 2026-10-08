import { showHUD } from "@raycast/api";
import { readPlaybackState, type PlaybackState } from "./utils/playback-state";
import {
  clampSpeed,
  formatSpeed,
  readPlaybackSpeed,
  SPEED_MAX,
  SPEED_STEP,
  writePlaybackSpeed,
} from "./utils/playback-speed";
import { getLastReadingSession, saveReadingSession, type ReadingSession } from "./utils/reading-session";

export default async function SpeedUpReading() {
  const live = await readPlaybackState();
  const session = await getLastReadingSession();
  const isLiveOrPaused =
    !!live && (live.phase === "synthesizing" || live.phase === "playing" || live.phase === "stopped");
  const hasPausedSession = !isLiveOrPaused && isPausedSession(session);

  if (!isLiveOrPaused && !hasPausedSession) {
    await showHUD("No active reading. Adjust the default speed in Preferences.");
    return;
  }

  const storedSpeed = await readPlaybackSpeed();
  const baseline = resolveBaselineSpeed(live, session, storedSpeed);
  const current = clampSpeed(baseline);

  if (current >= SPEED_MAX) {
    await showHUD(`Already at maximum speed (${formatSpeed(SPEED_MAX)})`);
    return;
  }

  const next = clampSpeed(current + SPEED_STEP);
  await writePlaybackSpeed(next);

  await persistPausedSessionSpeed(live, next);

  await showHUD(`Speed ${formatSpeed(next)} · applies to the next segment`);
}

function resolveBaselineSpeed(
  live: PlaybackState | null,
  session: ReadingSession | null,
  storedSpeed: number | null,
): number {
  if (live) return storedSpeed ?? live.speed ?? session?.options.speed ?? 1;
  if (isPausedSession(session)) return session.options.speed ?? storedSpeed ?? 1;
  return storedSpeed ?? 1;
}

async function persistPausedSessionSpeed(live: PlaybackState | null, speed: number): Promise<void> {
  if (live && (live.phase === "synthesizing" || live.phase === "playing")) {
    return;
  }

  const latestSession = await getLastReadingSession();
  if (!latestSession) return;
  if (live && !sessionMatchesLive(latestSession, live)) return;
  if (!live && !isPausedSession(latestSession)) return;

  await saveReadingSession({
    ...latestSession,
    options: { ...latestSession.options, speed },
  });
}

function isPausedSession(session: ReadingSession | null): session is ReadingSession {
  return !!session && session.nextChunkIndex > 0 && session.nextChunkIndex < session.chunks.length;
}

function sessionMatchesLive(
  session: { options: { voiceId: string }; source: string; text: string },
  live: { voiceId: string; source: string; totalChars: number },
): boolean {
  return (
    session.options.voiceId === live.voiceId &&
    session.source === live.source &&
    session.text.length === live.totalChars
  );
}
