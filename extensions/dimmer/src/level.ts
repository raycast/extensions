const MAX_LEVEL = 90;
const LEVEL_SEGMENTS = 10;

export function normalizeLevel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(MAX_LEVEL, Math.round(value)));
}

export function getLevelSegments(level: number): number {
  return Math.min(LEVEL_SEGMENTS, Math.max(0, Math.round((normalizeLevel(level) / MAX_LEVEL) * LEVEL_SEGMENTS)));
}

export function formatLevelBar(level: number): string {
  const filledSegments = getLevelSegments(level);
  return `${"●".repeat(filledSegments)}${"○".repeat(LEVEL_SEGMENTS - filledSegments)}`;
}
