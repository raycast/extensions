export function getProgressRatio(
  startEpochMs: number,
  endEpochMs: number,
  nowMs: number
): number {
  const durationMs = endEpochMs - startEpochMs;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 1;
  }

  const rawProgress = (nowMs - startEpochMs) / durationMs;
  if (rawProgress <= 0) return 0;
  if (rawProgress >= 1) return 1;
  return rawProgress;
}
