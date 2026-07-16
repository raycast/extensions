/**
 * Pure time-decay and saturation helpers used by ranking signals. Isolated here
 * so the math is unit-testable independently of any repository data.
 */

/** Milliseconds in one day. */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Exponential recency score in [0, 1]. Returns 1 at `timestampMs === nowMs` and
 * decays toward 0 as the event recedes into the past. A `null` timestamp scores
 * 0. Future timestamps are clamped to 1.
 *
 * @param timestampMs Event time (unix ms), or `null` if it never happened.
 * @param nowMs       Current time (unix ms).
 * @param halfLifeMs  Time after which the score halves. Must be > 0.
 */
export function recencyScore(timestampMs: number | null, nowMs: number, halfLifeMs: number): number {
  if (timestampMs === null || halfLifeMs <= 0) {
    return 0;
  }
  const ageMs = nowMs - timestampMs;
  if (ageMs <= 0) {
    return 1;
  }
  return Math.pow(0.5, ageMs / halfLifeMs);
}

/**
 * Saturating score in [0, 1) for an unbounded count. Zero maps to 0 and the
 * value approaches 1 as the count grows, with diminishing returns.
 *
 * @param count Non-negative count (e.g. number of opens).
 * @param k     Half-saturation constant: the count at which the score is 0.5.
 */
export function saturationScore(count: number, k: number): number {
  if (count <= 0 || k <= 0) {
    return 0;
  }
  return count / (count + k);
}
