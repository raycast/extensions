/**
 * Renders a segmented Unicode pill gauge (e.g. ▰▰▰▰▰▱▱▱▱▱).
 * @param usagePercent Usage percentage from 0 to 100
 * @param totalSegments Total number of segments in gauge (default: 10)
 * @param filledChar Character for used/filled space (default: '▰')
 * @param emptyChar Character for free/empty space (default: '▱')
 */
export function renderSegmentMeter(
  usagePercent: number,
  totalSegments = 10,
  filledChar = "▰",
  emptyChar = "▱",
): string {
  if (totalSegments <= 0) return "";
  const clamped = Math.max(
    0,
    Math.min(100, isNaN(usagePercent) ? 0 : usagePercent),
  );
  const filledCount = Math.min(
    totalSegments,
    Math.max(0, Math.round((clamped / 100) * totalSegments)),
  );
  const emptyCount = totalSegments - filledCount;
  return filledChar.repeat(filledCount) + emptyChar.repeat(emptyCount);
}

/**
 * Renders a 16-segment high-resolution Markdown sub-block gauge (e.g. ████████░░░░░░░░).
 * @param usagePercent Usage percentage from 0 to 100
 * @param totalSegments Total segment count (default: 16)
 */
export function renderHighResMeter(
  usagePercent: number,
  totalSegments = 16,
): string {
  if (totalSegments <= 0) return "";
  const clamped = Math.max(
    0,
    Math.min(100, isNaN(usagePercent) ? 0 : usagePercent),
  );
  const filledCount = Math.min(
    totalSegments,
    Math.max(0, Math.round((clamped / 100) * totalSegments)),
  );
  const emptyCount = totalSegments - filledCount;
  return "█".repeat(filledCount) + "░".repeat(emptyCount);
}
