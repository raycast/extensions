import { Sample } from "../types";
import { THRESHOLDS } from "./thresholds";

export function drainRate(samples: Sample[]): number | undefined {
  let drop = 0;
  let spanMs = 0;
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    if (prev.onAC !== false || cur.onAC !== false) continue;
    if (prev.percent === undefined || cur.percent === undefined) continue;
    const dt = cur.t - prev.t;
    if (dt <= 0 || dt > THRESHOLDS.maxGapMs) continue;
    drop += prev.percent - cur.percent;
    spanMs += dt;
  }
  if (spanMs < THRESHOLDS.minDrainSpanMs) return undefined;
  return drop / (spanMs / 3_600_000);
}

/** Names of the processes with the most energy impact summed over the window ending at `now`. */
export function topConsumers(samples: Sample[], now: number, windowMs: number, n: number): string[] {
  const totals = new Map<string, number>();
  for (const s of samples) {
    if (now - s.t > windowMs || s.t > now) continue;
    for (const p of s.procs) totals.set(p.cmd, (totals.get(p.cmd) ?? 0) + p.energy);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([cmd]) => cmd);
}
