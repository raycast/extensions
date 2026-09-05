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
 *
 * k is fitted twice, because a single window-wide fit lets today's in-flight
 * cost rescale days you have not reached yet. Days after today use the rate the
 * completed days settled on; the rest of today uses today's own. See "Splitting
 * the calibration" in `buildForecast`.
 *
 * The day-of-week profile is only a prior. What today actually looks like beats
 * it: a day is classified by its own pace, not by its position in the week, so a
 * quiet Wednesday that turns intensive is forecast as an intensive day within
 * the hour. See `buildForecast` for the two live corrections (today, rest of week).
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

/**
 * Elapsed share of a day's usual usage mass at which today's own pace outweighs
 * the weekday prior. 0.15 means the pace already leads by mid-morning.
 */
const TODAY_HALF_WEIGHT_MASS = 0.15;
/** Completed days in the window at which the week's own pace outweighs the prior. */
const WEEK_HALF_WEIGHT_DAYS = 2;
/**
 * Widest correction allowed before shrinking, either direction. Today's bound is
 * loose because the day cap already grounds it in a day you have actually had;
 * this only guards against a near-zero prior blowing the ratio up. The week's
 * bound is tight — several days running 4× off pattern is already extreme.
 */
const MAX_TODAY_RATIO = 25;
const MAX_WEEK_RATIO = 4;
/** Which of your busy days becomes the ceiling for a single day. */
const DAY_CAP_PERCENTILE = 0.9;
const DAY_CAP_HEADROOM = 1.15;
/**
 * How far a per-segment calibration may stray from the window-wide one. The
 * local cost model is a proxy, so its %-per-$ genuinely wanders day to day;
 * this stops one thin or mis-attributed segment from rescaling the week.
 */
const MAX_K_RATIO = 4;
/**
 * Percentage points today must have moved before its own rate is trusted. The
 * API reports whole percents, so a smaller delta is mostly rounding.
 */
const MIN_TODAY_PCT_DELTA = 3;

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** DST-safe: +36h then snap back, so a 23h or 25h day still lands on midnight. */
function nextLocalMidnight(ms: number): number {
  return startOfLocalDay(startOfLocalDay(ms) + 36 * HOUR);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
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

/**
 * Ceiling for one day's weight: the recency-weighted 90th percentile of the days
 * that saw any usage, plus a little headroom. Days with no usage are excluded —
 * this describes what an active day of yours looks like, not an average day.
 *
 * This is the grounding for the live corrections. A correction may say today
 * looks like your busiest kind of day; it may not invent a day you never had.
 * Returns Infinity when there is too little history to bound anything.
 */
function buildDayCap(
  daily: Map<string, number>,
  rangeStart: number,
  rangeEnd: number,
  now: number,
): number {
  const obs: Array<{ cost: number; weight: number }> = [];
  for (let t = startOfLocalDay(rangeStart); t < rangeEnd; t += DAY) {
    const dayStart = startOfLocalDay(t);
    const cost = daily.get(localDate(dayStart)) ?? 0;
    if (cost <= 0.05) continue;
    const ageDays = (now - dayStart) / DAY;
    obs.push({ cost, weight: Math.pow(0.5, ageDays / HALF_LIFE_DAYS) });
  }
  if (obs.length === 0) return Infinity;
  const highest = Math.max(...obs.map((o) => o.cost)) * DAY_CAP_HEADROOM;
  if (obs.length < 5) return highest;

  obs.sort((a, b) => a.cost - b.cost);
  const total = obs.reduce((s, o) => s + o.weight, 0);
  let acc = 0;
  for (const o of obs) {
    acc += o.weight;
    if (acc >= total * DAY_CAP_PERCENTILE) return o.cost * DAY_CAP_HEADROOM;
  }
  return highest;
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

/**
 * How much of a day's usual usage mass falls in `[from, to)`. Both bounds are
 * expected inside one local day; a partial hour counts pro rata. 1 means the
 * whole day, so this is the unit that makes a partial day comparable to a full one.
 */
function hourMass(hourProfile: number[], from: number, to: number): number {
  if (to <= from) return 0;
  let s = 0;
  for (let t = Math.floor(from / HOUR) * HOUR; t < to; t += HOUR) {
    const lo = Math.max(from, t);
    const hi = Math.min(to, t + HOUR);
    if (hi <= lo) continue;
    s += hourProfile[new Date(t).getHours()] * ((hi - lo) / HOUR);
  }
  return s;
}

/**
 * The real weekly percentage as of `at`, from the persisted sample log. Samples
 * are only comparable inside one window, so a sample is only usable when its
 * reset matches this window's — the reset timestamp jitters by a few seconds
 * between fetches, hence the tolerance. Null when the poll has not run in this
 * window before `at`.
 */
function pctAt(
  samples: Sample[],
  windowEnd: number,
  at: number,
): number | null {
  let best: Sample | null = null;
  for (const s of samples) {
    if (s.t > at) continue;
    if (s.resetsAt === null || Math.abs(s.resetsAt - windowEnd) > HOUR)
      continue;
    if (best === null || s.t > best.t) best = s;
  }
  return best === null ? null : best.weekly;
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

  const cap = buildDayCap(history.daily, profileStart, windowStart, now);

  // --- Live correction 1: today ---------------------------------------------
  // The weekday weight is a prior. Today's own pace, extrapolated to a full-day
  // weight, is the observation. Blend them geometrically, with the observation's
  // weight rising as the day elapses — it passes half at TODAY_HALF_WEIGHT_MASS of
  // a usual day, i.e. mid-morning, so at 08:00 a single burst cannot rewrite the day.
  const todayStart = startOfLocalDay(now);
  // Only the slice of today that lies inside this window can inform this window.
  const todayFrom = Math.max(todayStart, windowStart);
  const todayActual = sumHourly(history.hourly, todayFrom, now);
  const elapsedMass = hourMass(hourProfile, todayFrom, now);
  const todayPrior = dowProfile[new Date(now).getDay()];

  let todayWeight = 0;
  let todayIntensity = todayPrior;
  let todayPaced: number | null = null;
  // Without calibration there is no usable local signal, so leave the prior alone.
  // A day already past the cap is evidence, not noise — never bound below reality.
  const capToday = Math.max(cap, todayActual);
  if (k !== null && elapsedMass > 0.02) {
    // What a full day at today's pace would weigh, bounded by a real day of yours.
    const paced = Math.min(todayActual / elapsedMass, capToday);
    todayPaced = paced;
    todayWeight = elapsedMass / (elapsedMass + TODAY_HALF_WEIGHT_MASS);
    if (todayPrior > 0.05) {
      const ratio = clamp(
        paced / todayPrior,
        1 / MAX_TODAY_RATIO,
        MAX_TODAY_RATIO,
      );
      todayIntensity = todayPrior * Math.pow(ratio, todayWeight);
    } else {
      // This weekday is normally idle, so there is no prior to blend against.
      // Lean on the pace alone, discounted by how much of the day it has seen.
      todayIntensity = paced * todayWeight;
    }
    todayIntensity = Math.min(todayIntensity, capToday);
  }

  // --- Live correction 2: the rest of the week ------------------------------
  // Same idea one level up, from *completed* days only — today is excluded so its
  // correction is not counted twice. A week running hot keeps running hot.
  let doneExpected = 0;
  let doneActual = 0;
  let doneDays = 0;
  for (let t = startOfLocalDay(windowStart); t < todayStart; t += DAY) {
    const dayStart = startOfLocalDay(t);
    const from = Math.max(dayStart, windowStart);
    const to = Math.min(nextLocalMidnight(dayStart), todayStart);
    if (to <= from) continue;
    doneExpected +=
      dowProfile[new Date(dayStart).getDay()] * hourMass(hourProfile, from, to);
    doneActual += sumHourly(history.hourly, from, to);
    doneDays++;
  }

  let weekFactor = 1;
  if (k !== null && doneExpected > 0.05) {
    const ratio = clamp(
      doneActual / doneExpected,
      1 / MAX_WEEK_RATIO,
      MAX_WEEK_RATIO,
    );
    weekFactor = Math.pow(ratio, doneDays / (doneDays + WEEK_HALF_WEIGHT_DAYS));
  }

  // --- Splitting the calibration -------------------------------------------
  // One window-wide k folds today's in-flight cost into the conversion factor,
  // so a day whose %-per-$ runs off the week's average quietly rescales every
  // *future* day too — the forecast for Friday moves because of what you did
  // this morning. The cost model is a proxy, and its %-per-$ genuinely varies
  // several-fold between days, so that coupling is noise, not signal.
  //
  // Split it in two. Days after today convert with the rate the *closed* days
  // of this window settled on, so their trajectory holds all day and only
  // re-baselines at midnight. What is left of today converts with today's own
  // observed rate, which keeps the end-of-day landing consistent with the
  // percentage the API has actually charged for today's work.
  const costBeforeToday = sumHourly(history.hourly, windowStart, todayStart);
  const pctAtTodayStart = pctAt(samples, windowEnd, todayStart);
  const pctToday = pctAtTodayStart === null ? 0 : pctNow - pctAtTodayStart;

  let kBase = k;
  let kToday = k;
  if (
    k !== null &&
    pctAtTodayStart !== null &&
    todayStart > windowStart &&
    costBeforeToday > 0.05
  ) {
    const lo = k / MAX_K_RATIO;
    const hi = k * MAX_K_RATIO;
    kBase = clamp(pctAtTodayStart / costBeforeToday, lo, hi);
    // Whole-percent reporting makes a small delta mostly rounding; until today
    // has moved enough to read, it inherits the closed-day rate.
    kToday =
      pctToday >= MIN_TODAY_PCT_DELTA && todayActual > 0.05
        ? clamp(pctToday / todayActual, lo, hi)
        : kBase;
  }

  // Project hour by hour to window end.
  const projected: ForecastPoint[] = [{ t: now, pct: pctNow }];
  let hitsLimitAt: number | null = null;
  let pct = pctNow;
  const kFuture = kBase ?? 0;
  const kRestOfToday = kToday ?? 0;

  const firstHour = Math.floor(now / HOUR) * HOUR;
  for (let t = firstHour; t < windowEnd; t += HOUR) {
    const d = new Date(t);
    const isToday = startOfLocalDay(t) === todayStart;
    // Today uses its live intensity; later days use the prior nudged by the week.
    const dayWeight = isToday
      ? todayIntensity
      : Math.min(dowProfile[d.getDay()] * weekFactor, cap);
    // Only the slice of this hour between now and the reset can still accrue.
    // Both ends are clipped: the current hour is part-elapsed, and the window
    // usually ends mid-hour, so charging a full hour there would push the
    // crossing past a reset that has already wiped the counter.
    const from = Math.max(t, now);
    const to = Math.min(t + HOUR, windowEnd);
    if (to <= from) continue;
    const expected =
      dayWeight * hourProfile[d.getHours()] * ((to - from) / HOUR);
    const prev = pct;
    pct += (isToday ? kRestOfToday : kFuture) * expected;
    projected.push({ t: to, pct });
    if (hitsLimitAt === null && pct >= 100 && k !== null) {
      // Interpolate inside the slice for a usable ETA. Bounded by `to`, so a
      // limit only "hits" if it is reached strictly before the reset.
      const frac = pct === prev ? 1 : (100 - prev) / (pct - prev);
      hitsLimitAt = Math.max(now, from + frac * (to - from));
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
    kBase,
    kToday,
    costBeforeToday,
    pctToday: pctAtTodayStart === null ? null : pctToday,
    costSoFar,
    actual,
    projected,
    pctAtReset: pct,
    hitsLimitAt,
    dowProfile,
    hourProfile,
    profileDays,
    todayPrior,
    todayIntensity,
    todayPaced,
    todayWeight,
    todayActual,
    elapsedMass,
    todayCap: Number.isFinite(capToday) ? capToday : null,
    weekFactor,
    weekDaysDone: doneDays,
    dayCap: Number.isFinite(cap) ? cap : null,
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
