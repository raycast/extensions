import { clearSession, getSession, saveSession, SessionState } from "./session";
import { ExtensionPreferences } from "./preferences";
import { parseIntervalMs } from "./interval";
import { getTitleAnimationCycleMs, renderCountdownBase64 } from "./render";
import { pushImage } from "./push-provider";
import { getProgressRatio } from "./progress";

export function formatRemaining(
  remainingMinutes: number,
  totalMinutes: number
): string {
  const safeTotal = Math.max(0, Math.round(totalMinutes));
  const safeRemaining = Math.max(0, Math.round(remainingMinutes));
  const clampedRemaining = Math.min(safeRemaining, safeTotal);
  return `${clampedRemaining}/${safeTotal}m`;
}

export function getRemainingMinutes(endEpochMs: number, nowMs: number): number {
  const remainingMs = endEpochMs - nowMs;
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  return Math.max(0, remainingMinutes);
}

export async function pushIfNeeded(
  prefs: ExtensionPreferences,
  options?: { force?: boolean }
): Promise<SessionState | null> {
  const session = await getSession();
  if (!session) return null;

  const nowMs = Date.now();
  const remainingMinutes = getRemainingMinutes(session.endEpochMs, nowMs);
  const intervalMs = parseIntervalMs(prefs.updateInterval);
  const animationCycleMs = getTitleAnimationCycleMs(session.title);
  const minIntervalMs = Math.max(intervalMs, animationCycleMs ?? 0);

  if (!options?.force) {
    if (session.lastPushedMinute === remainingMinutes) return session;
    if (
      session.lastPushedAtMs &&
      nowMs - session.lastPushedAtMs < minIntervalMs
    )
      return session;
  }

  const totalMinutes = Math.max(0, Math.ceil(session.durationSec / 60));
  const text = formatRemaining(remainingMinutes, totalMinutes);
  const progress = getProgressRatio(
    session.startEpochMs,
    session.endEpochMs,
    nowMs
  );
  const base64Webp = await renderCountdownBase64({
    text,
    progress,
    title: session.title,
    nowMs,
    startEpochMs: session.startEpochMs,
  });

  await pushImage(prefs, session.installationId, base64Webp);

  if (remainingMinutes === 0) {
    await clearSession();
    return null;
  }

  const updated: SessionState = {
    ...session,
    lastPushedMinute: remainingMinutes,
    lastPushedAtMs: nowMs,
  };
  await saveSession(updated);
  return updated;
}
