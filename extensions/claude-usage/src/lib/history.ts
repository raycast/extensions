import { Cache } from "@raycast/api";
import type { BurnRate, ClaudeUsage, Sample } from "./types";

const cache = new Cache({ namespace: "claude-usage" });
const HISTORY_KEY = "history";
const MAX_AGE = 6 * 60 * 60 * 1000; // keep 6h of samples
const MIN_SPAN = 8 * 60 * 1000; // need ≥8 min of data before showing a rate

function load(): Sample[] {
  const raw = cache.get(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Sample[];
  } catch {
    return [];
  }
}

/** Record a snapshot. Skips duplicates fetched within the same minute. */
export function recordSample(usage: ClaudeUsage): void {
  const samples = load().filter((s) => Date.now() - s.t < MAX_AGE);
  const last = samples[samples.length - 1];
  if (last && usage.fetchedAt - last.t < 55_000) return;

  const fh = usage.fiveHour?.utilization ?? null;
  // Drop history across a session reset so the rate doesn't go negative
  if (last && last.fiveHour !== null && fh !== null && fh < last.fiveHour - 1) {
    samples.length = 0;
  }
  samples.push({
    t: usage.fetchedAt,
    fiveHour: fh,
    sevenDay: usage.sevenDay?.utilization ?? null,
  });
  cache.set(HISTORY_KEY, JSON.stringify(samples));
}

export function computeBurnRate(usage: ClaudeUsage): BurnRate {
  const samples = load();
  const now = Date.now();
  // Use up to the last 60 minutes for the rate — recent enough to reflect current pace
  const window = samples.filter(
    (s) => now - s.t <= 60 * 60 * 1000 && s.fiveHour !== null,
  );

  const empty: BurnRate = {
    sessionPerHour: null,
    weeklyPerHour: null,
    projectedSessionAtReset: null,
    sessionExhaustedAt: null,
    windowMinutes: 0,
  };

  if (window.length < 2) return empty;
  const first = window[0];
  const last = window[window.length - 1];
  const spanMs = last.t - first.t;
  if (spanMs < MIN_SPAN) return empty;

  const spanH = spanMs / 3_600_000;
  const sessionPerHour =
    first.fiveHour !== null && last.fiveHour !== null
      ? (last.fiveHour - first.fiveHour) / spanH
      : null;
  const weeklyPerHour =
    first.sevenDay !== null && last.sevenDay !== null
      ? (last.sevenDay - first.sevenDay) / spanH
      : null;

  let projectedSessionAtReset: number | null = null;
  let sessionExhaustedAt: number | null = null;

  if (sessionPerHour !== null && usage.fiveHour) {
    const resetsAt = usage.fiveHour.resetsAt
      ? new Date(usage.fiveHour.resetsAt).getTime()
      : null;
    if (resetsAt && resetsAt > now) {
      const hoursLeft = (resetsAt - now) / 3_600_000;
      projectedSessionAtReset = Math.min(
        100,
        usage.fiveHour.utilization + Math.max(0, sessionPerHour) * hoursLeft,
      );
    }
    if (sessionPerHour > 0.5) {
      const remaining = 100 - usage.fiveHour.utilization;
      sessionExhaustedAt = now + (remaining / sessionPerHour) * 3_600_000;
    }
  }

  return {
    sessionPerHour,
    weeklyPerHour,
    projectedSessionAtReset,
    sessionExhaustedAt,
    windowMinutes: Math.round(spanMs / 60_000),
  };
}
