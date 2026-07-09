/** Use `fallback` only when the raw pref is absent, blank, or not a finite
 * number — an intentional "0" is preserved (Number("") is 0, so guard it). */
function parsePrefNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Resolve shadowing-loop preferences into concrete params.
 * - times: at least 1 (looping 0 or a negative number of times is meaningless)
 * - gapMs: a gap of 0 is honored (no pause); negatives clamp to 0 */
export function resolveLoop(
  loopCount: string | undefined,
  loopGap: string | undefined,
): { times: number; gapMs: number } {
  const times = Math.max(1, Math.round(parsePrefNumber(loopCount, 3)));
  const gapMs = Math.max(0, parsePrefNumber(loopGap, 1)) * 1000;
  return { times, gapMs };
}
