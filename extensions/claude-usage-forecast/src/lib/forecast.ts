/**
 * Turns (real utilization now) + (local transcript history) into a forecast.
 *
 * The two data sources are in different units. The API reports a percentage of
 * an opaque, model-weighted weekly budget; the transcripts give token counts we
 * convert to a cost-like weight. Rather than guess the budget, we calibrate:
 *
 *     k = utilizationNow / costInsideThisWindowSoFar        [% per USD]
 *
 * and project forward with k. That makes the absolute scale of the cost model
 * irrelevant and keeps the forecast anchored to the number Claude Code shows.
 */
import { localDate } from "./jsonl";
import {
  Forecast,
  ForecastPoint,
  RateLimits,
  Sample,
  UsageHistory,
} from "./types";

const HOUR = 3_600_000;
const DAY = 86_400_000;
/** Recent weeks describe current habits better than old ones. */
const HALF_LIFE_DAYS = 21;

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Weighted mean cost per weekday, index 0 = Sunday.
 *
 * Every calendar day in range counts, including days with zero usage — a quiet
 * Sunday is signal, not a gap. Each weekday's single largest day is dropped once
 * there are 5+ observations, so one runaway session does not dominate.
 */
function buildDowProfile(
  daily: Map<string, number>,
  rangeStart: number,
  rangeEnd: number,
  now: number,
): { profile: number[]; days: number } {
  const buckets: Array<Array<{ cost: number; weight: number }>> = Array.from(
    { length: 7 },
    () => [],
  );
  let days = 0;

  for (let t = startOfLocalDay(rangeStart); t < rangeEnd; t += DAY) {
    // DST-safe: re-normalize to the local midnight of whatever day we landed on.
    const dayStart = startOfLocalDay(t);
    const cost = daily.get(localDate(dayStart)) ?? 0;
    const ageDays = (now - dayStart) / DAY;
    const weight = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    buckets[new Date(dayStart).getDay()].push({ cost, weight });
    days++;
  }

  const profile = buckets.map((obs) => {
    if (obs.length === 0) return 0;
    let use = obs;
    if (obs.length >= 5) {
      const maxIdx = obs.reduce(
        (best, o, i) => (o.cost > obs[best].cost ? i : best),
        0,
      );
      use = obs.filter((_, i) => i !== maxIdx);
    }
    const wsum = use.reduce((s, o) => s + o.weight, 0);
    if (wsum === 0) return 0;
    return use.reduce((s, o) => s + o.cost * o.weight, 0) / wsum;
  });

  return { profile, days };
}

/** Normalized share of a day's usage falling in each local hour. Sums to 1. */
function buildHourProfile(
  hourly: Map<number, number>,
  rangeStart: number,
  rangeEnd: number,
): number[] {
  const w = new Array(24).fill(0);
  for (const [h, cost] of hourly) {
    if (h < rangeStart || h >= rangeEnd) continue;
    w[new Date(h).getHours()] += cost;
  }
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return new Array(24).fill(1 / 24);
  return w.map((x) => x / total);
}

function sumHourly(
  hourly: Map<number, number>,
  from: number,
  to: number,
): number {
  let s = 0;
  for (const [h, cost] of hourly) {
    if (h >= from && h < to) s += cost;
  }
  return s;
}

function cumulativeActual(
  hourly: Map<number, number>,
  from: number,
  to: number,
  k: number,
  base: number,
): ForecastPoint[] {
  // Walk the populated hour buckets directly. Stepping `from` by HOUR would miss
  // every bucket, because a weekly window starts at the reset minute (e.g.
  // 10:59:59), not on an hour boundary.
  const buckets = [...hourly.entries()]
    .filter(([h]) => h >= from && h < to)
    .sort((a, b) => a[0] - b[0]);

  const points: ForecastPoint[] = [{ t: from, pct: 0 }];
  let acc = 0;
  for (const [h, cost] of buckets) {
    // Cost accrues across the hour, so credit it at the hour's end.
    acc += cost;
    points.push({ t: Math.min(Math.max(h + HOUR, from), to), pct: acc * k });
  }
  points.push({ t: to, pct: acc * k });
  // Pin the end of the reconstruction to the real utilization so the actual line
  // and the API number always agree at "now".
  const drift = base - (points[points.length - 1]?.pct ?? 0);
  if (points.length > 1 && Math.abs(drift) > 0.001) {
    const span = points.length - 1;
    for (let i = 1; i < points.length; i++) points[i].pct += (drift * i) / span;
  }
  return points;
}

export function buildForecast(
  limits: RateLimits,
  history: UsageHistory,
  samples: Sample[],
  lookbackDays: number,
): Forecast {
  const warnings: string[] = [];
  const now = Date.now();
  const pctNow = limits.weekly?.utilization ?? 0;

  const windowEnd = limits.weekly?.resetsAt ?? startOfLocalDay(now) + 7 * DAY;
  if (limits.weekly?.resetsAt == null) {
    warnings.push(
      "API did not report a weekly reset time; assuming 7 days from today.",
    );
  }
  const windowStart = windowEnd - 7 * DAY;

  const costSoFar = sumHourly(history.hourly, windowStart, now);

  let k: number | null = null;
  if (pctNow > 0 && costSoFar > 0.05) {
    k = pctNow / costSoFar;
  } else if (costSoFar <= 0.05) {
    warnings.push(
      "Almost no local transcript activity in this window — cannot calibrate, forecast is flat.",
    );
  } else {
    warnings.push(
      "Weekly utilization is 0% — nothing to calibrate against yet.",
    );
  }

  const profileStart = Math.max(
    history.firstSeen ?? now - lookbackDays * DAY,
    now - lookbackDays * DAY,
  );
  const { profile: dowProfile, days: profileDays } = buildDowProfile(
    history.daily,
    profileStart,
    windowStart,
    now,
  );
  const hourProfile = buildHourProfile(
    history.hourly,
    profileStart,
    windowStart,
  );

  if (profileDays < 14) {
    warnings.push(
      `Only ${profileDays} days of history before this window — the day-of-week pattern is weak.`,
    );
  }

  // Project hour by hour to window end.
  const projected: ForecastPoint[] = [{ t: now, pct: pctNow }];
  let hitsLimitAt: number | null = null;
  let pct = pctNow;
  const kEff = k ?? 0;

  const firstHour = Math.floor(now / HOUR) * HOUR;
  for (let t = firstHour; t < windowEnd; t += HOUR) {
    const d = new Date(t);
    let expected = dowProfile[d.getDay()] * hourProfile[d.getHours()];
    if (t === firstHour) {
      // Only the unelapsed part of the current hour is still to come.
      expected *= 1 - (now - firstHour) / HOUR;
    }
    const prev = pct;
    pct += kEff * expected;
    const at = Math.min(t + HOUR, windowEnd);
    projected.push({ t: at, pct });
    if (hitsLimitAt === null && pct >= 100 && k !== null) {
      // Interpolate inside the hour for a usable ETA.
      const frac = pct === prev ? 1 : (100 - prev) / (pct - prev);
      hitsLimitAt = Math.max(now, t + frac * HOUR);
    }
  }

  if (pctNow >= 100) hitsLimitAt = now;

  const actual =
    k === null
      ? [
          { t: windowStart, pct: 0 },
          { t: now, pct: pctNow },
        ]
      : cumulativeActual(history.hourly, windowStart, now, k, pctNow);

  return {
    pctNow,
    windowStart,
    windowEnd,
    k,
    costSoFar,
    actual,
    projected,
    pctAtReset: pct,
    hitsLimitAt,
    dowProfile,
    hourProfile,
    profileDays,
    samples: samples.filter((s) => s.t >= windowStart && s.t <= windowEnd),
    warnings,
  };
}

export const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDuration(ms: number): string {
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rm = mins % 60;
  if (hours < 24) return rm === 0 ? `${hours}h` : `${hours}h ${rm}m`;
  const days = Math.floor(hours / 24);
  const rh = hours % 24;
  return rh === 0 ? `${days}d` : `${days}d ${rh}h`;
}
