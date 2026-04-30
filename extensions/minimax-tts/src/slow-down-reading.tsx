import { showHUD } from "@raycast/api";
import { readPlaybackState, type PlaybackState } from "./utils/playback-state";
import {
  clampSpeed,
  formatSpeed,
  readPlaybackSpeed,
  SPEED_MIN,
  SPEED_STEP,
  writePlaybackSpeed,
} from "./utils/playback-speed";
import { getLastReadingSession, saveReadingSession, type ReadingSession } from "./utils/reading-session";

export default async function SlowDownReading() {
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

  if (current <= SPEED_MIN) {
    await showHUD(`Already at minimum speed (${formatSpeed(SPEED_MIN)})`);
    return;
  }

  const next = clampSpeed(current - SPEED_STEP);
  await writePlaybackSpeed(next);

  if (session && shouldPersistSessionSpeed(session, live)) {
    await saveReadingSession({
      ...session,
      options: { ...session.options, speed: next },
    });
  }

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

function shouldPersistSessionSpeed(session: ReadingSession, live: PlaybackState | null): boolean {
  if (!live) return isPausedSession(session);
  return sessionMatchesLive(session, live);
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
