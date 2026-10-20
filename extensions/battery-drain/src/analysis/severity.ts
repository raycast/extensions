import { THRESHOLDS, Thresholds } from "./thresholds";

export type Severity = "low" | "moderate" | "high" | "critical";

/**
 * A process's current CPU (share of one core) as a tone. Red is kept for flagged runaways, as in
 * wattSeverity: a process at 99% for a minute is high (orange, like its "High" tag), not critical.
 */
export function cpuSeverity(cpu: number, runaway: boolean): Severity {
  if (runaway) return "critical";
  if (cpu >= 50) return "high";
  if (cpu >= 25) return "moderate";
  return "low";
}

/** System draw as a chart tone, relative to the high-draw preference; red is kept for runaways. */
export function wattSeverity(w: number | undefined, runaway: boolean, th: Thresholds = THRESHOLDS): Severity {
  if (runaway) return "critical";
  if (w === undefined) return "low";
  if (w >= th.highWatts) return "high";
  if (w >= th.highWatts / 2) return "moderate";
  return "low";
}
