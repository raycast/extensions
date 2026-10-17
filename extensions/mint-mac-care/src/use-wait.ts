import { Cache } from "@raycast/api";
import { expectedSeconds } from "./progress-estimate";

const cache = new Cache({ namespace: "mint-wait" });
const KEPT = 5;

/** How long a request took on its recent runs, newest first. */
export function recentDurations(key: string): number[] {
  return (cache.get(key) ?? "")
    .split(",")
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
}

/** How long to expect, so a Mint that reports no progress gets an estimate. */
export function expectedDuration(key: string, fallback = 60): number {
  return expectedSeconds(recentDurations(key), fallback);
}

export function rememberDuration(key: string, seconds: number): void {
  if (!(seconds > 0)) return;
  cache.set(key, [Math.round(seconds), ...recentDurations(key)].slice(0, KEPT).join(","));
}
