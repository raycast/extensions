import { THRESHOLDS } from "./thresholds";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Mean wattage weighted by how long each reading lasted. History arrives once a minute and live
 * readings more often; a plain mean would lean on whichever part has more points.
 */
export function timeWeightedAverage(points: { t: number; w: number }[]): number | undefined {
  if (points.length === 0) return undefined;
  if (points.length === 1) return points[0].w;
  const steps = points.slice(1).map((p, i) => p.t - points[i].t);
  // A step longer than a sleep gap counts as a typical one, so a reading taken before the lid closed
  // does not count for the whole sleep.
  const typical = median(steps);
  const weights = [...steps.map((s) => (s > THRESHOLDS.maxGapMs ? typical : s)), typical];
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return points.reduce((a, p) => a + p.w, 0) / points.length;
  return points.reduce((sum, p, i) => sum + p.w * weights[i], 0) / total;
}

/** Delay until the next poll so polls start every `periodMs`, whatever a collection took. */
export function nextPollDelay(elapsedMs: number, periodMs: number): number {
  return Math.max(0, periodMs - elapsedMs);
}
