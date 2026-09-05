import { environment, getPreferenceValues } from "@raycast/api";
import { buildForecast } from "./forecast";
import {
  readLastLimits,
  readSamples,
  appendSample,
  writeLastLimits,
} from "./history";
import { scanUsage } from "./jsonl";
import { fetchRateLimits, UsageApiError } from "./usage-api";
import { Forecast, RateLimits } from "./types";

export interface Settings {
  lookbackDays: number;
  warnAt: number;
  dangerAt: number;
  chartMode: "dataUri" | "file" | "blocks";
  menuBarShow: "weekly" | "both" | "spark" | "icon";
}

function num(
  v: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = Number.parseFloat(v ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function settings(): Settings {
  // `Preferences` is the manifest-generated global type (see raycast-env.d.ts);
  // shadowing it with a hand-maintained interface would drift from package.json.
  const p = getPreferenceValues<Preferences>();
  return {
    lookbackDays: Math.round(num(p.lookbackDays, 70, 14, 400)),
    warnAt: num(p.warnAt, 75, 1, 100),
    dangerAt: num(p.dangerAt, 90, 1, 100),
    chartMode: p.chartMode ?? "dataUri",
    menuBarShow: p.menuBarShow ?? "weekly",
  };
}

/** Every limit window on `RateLimits`; a new one must be expired like the rest. */
const LIMIT_WINDOWS = [
  "weekly",
  "fiveHour",
  "weeklyOpus",
  "weeklySonnet",
] as const satisfies ReadonlyArray<keyof RateLimits>;

/** Null out each cached window whose reset has passed. */
function expireClosedWindows(limits: RateLimits): void {
  const now = Date.now();
  for (const key of LIMIT_WINDOWS) {
    const w = limits[key];
    if (w?.resetsAt && w.resetsAt < now) limits[key] = null;
  }
}

export interface LoadResult {
  limits: RateLimits;
  forecast: Forecast;
  /** true when the API call failed and a cached result was used */
  stale: boolean;
  error: string | null;
  filesScanned: number;
  filesTotal: number;
}

export async function load(): Promise<LoadResult> {
  const s = settings();
  const support = environment.supportPath;

  let limits: RateLimits | null = null;
  let error: string | null = null;
  let stale = false;

  try {
    limits = await fetchRateLimits();
    appendSample(support, limits);
    writeLastLimits(support, limits);
  } catch (e) {
    error =
      e instanceof UsageApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
    limits = readLastLimits(support);
    // Discard every cached window that has already closed: presenting a past
    // window's percentage as "now" would silently mislead. Each window resets
    // on its own clock, so they are expired independently. The weekly window
    // then gates the whole reading (the forecast needs it); the others are
    // rendered conditionally and tolerate null.
    if (limits) {
      expireClosedWindows(limits);
      if (!limits.weekly) limits = null;
    }
    stale = limits !== null;
    if (!limits) throw e;
  }

  const history = scanUsage(support, s.lookbackDays);
  const samples = readSamples(support);
  const forecast = buildForecast(limits, history, samples, s.lookbackDays);
  if (stale) {
    forecast.warnings.unshift(
      `Live fetch failed, showing the reading from ${new Date(limits.fetchedAt).toLocaleString()}.`,
    );
  }

  return {
    limits,
    forecast,
    stale,
    error,
    filesScanned: history.filesScanned,
    filesTotal: history.filesTotal,
  };
}

export type Severity = "ok" | "warn" | "danger";

export function severityOf(pct: number, s: Settings): Severity {
  if (pct >= s.dangerAt) return "danger";
  if (pct >= s.warnAt) return "warn";
  return "ok";
}
