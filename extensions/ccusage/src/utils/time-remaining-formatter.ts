/**
 * Format time remaining until a reset with a user-provided template string.
 *
 * Supported placeholders:
 *   {h}   — whole hours (0, 1, 2, …)
 *   {m}   — remaining minutes after whole hours (0–59)
 *   {M}   — total minutes (62, 123, …)
 *   {h.f} — fractional hours to 2 decimal places (1.03, 2.50, …)
 *
 * Returns `null` when there is no active reset time or the window has lapsed.
 */
export function formatTimeRemainingCustom(resetAt: string | null | undefined, format: string): string | null {
  if (!resetAt) return null;

  const diffMs = new Date(resetAt).getTime() - Date.now();
  if (Number.isNaN(diffMs) || diffMs <= 0) return null;

  const totalMinutes = Math.round(diffMs / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return format
    .replaceAll("{h.f}", (totalMinutes / 60).toFixed(2))
    .replaceAll("{M}", String(totalMinutes))
    .replaceAll("{h}", String(h))
    .replaceAll("{m}", String(m));
}
