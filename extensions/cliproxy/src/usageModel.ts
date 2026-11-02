/** Quota observations contain opaque account keys, never names, emails or credentials. */
export type Observation = {
  account: string;
  provider: string;
  label: string;
  at: number;
  left: number;
  resetsAt: number | null;
  periodMs?: number | null;
};
export type Point = { at: number; value: number | null };
export type Hour = { at: number; used: number; observedMs: number; rate: number };
export type AccountRate = { account: string; rate: number; observedMs: number; intervals: number };
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const RETENTION = 28 * DAY;
export const MAX_GAP = 90 * 60_000;

/** Integrate only adjacent observations from the same reset window. Unknown time stays unknown, not zero. */
export function usageIntervals(observations: Observation[]) {
  const groups = new Map<string, Observation[]>();
  for (const o of observations) {
    const key = JSON.stringify([o.provider, o.account, o.label]);
    const group = groups.get(key) ?? [];
    group.push(o);
    groups.set(key, group);
  }
  const result: { account: string; start: number; end: number; used: number }[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.at - b.at);
    let previous = group[0];
    for (const current of group.slice(1)) {
      const elapsed = current.at - previous.at;
      if (elapsed < 60_000) continue;
      const sameReset =
        previous.resetsAt !== null &&
        current.resetsAt !== null &&
        Math.abs(previous.resetsAt - current.resetsAt) < 120_000 &&
        previous.resetsAt > current.at;
      if (elapsed <= MAX_GAP && sameReset && current.left <= previous.left) {
        result.push({
          account: current.account,
          start: previous.at,
          end: current.at,
          used: previous.left - current.left,
        });
      }
      previous = current;
    }
  }
  return result;
}

/** Split each measured delta across clock hours by overlap, retaining duration to avoid averaging unequal samples. */
export function hourlyUsage(observations: Observation[], since: number, until: number): Map<string, Hour[]> {
  const accounts = new Map<string, Map<number, Hour>>();
  for (const interval of usageIntervals(observations)) {
    const start = Math.max(since, interval.start);
    const end = Math.min(until, interval.end);
    const hours = accounts.get(interval.account) ?? new Map<number, Hour>();
    for (let at = Math.floor(start / HOUR) * HOUR; at < end; at += HOUR) {
      const overlap = Math.min(end, at + HOUR) - Math.max(start, at);
      if (overlap <= 0) continue;
      const hour = hours.get(at) ?? { at, used: 0, observedMs: 0, rate: 0 };
      hour.used += (interval.used * overlap) / (interval.end - interval.start);
      hour.observedMs += overlap;
      hour.rate = (hour.used * HOUR) / hour.observedMs;
      hours.set(at, hour);
    }
    accounts.set(interval.account, hours);
  }
  return new Map([...accounts].map(([account, hours]) => [account, [...hours.values()].sort((a, b) => a.at - b.at)]));
}

export function accountRates(observations: Observation[], since: number, until: number): AccountRate[] {
  const totals = new Map<string, AccountRate & { used: number }>();
  for (const i of usageIntervals(observations)) {
    const overlap = Math.min(i.end, until) - Math.max(i.start, since);
    if (overlap <= 0) continue;
    const total = totals.get(i.account) ?? { account: i.account, used: 0, observedMs: 0, rate: 0, intervals: 0 };
    total.used += (i.used * overlap) / (i.end - i.start);
    total.observedMs += overlap;
    total.intervals++;
    total.rate = (total.used * HOUR) / total.observedMs;
    totals.set(i.account, total);
  }
  return [...totals.values()];
}

/** Only complete provider totals are plotted. A missing account creates a gap instead of an artificial dip. */
export function remainingHistory(observations: Observation[], accounts: string[], since: number): Point[] {
  const buckets = new Map<number, Map<string, Observation>>();
  for (const o of observations) {
    if (o.at < since || !accounts.includes(o.account)) continue;
    const at = Math.floor(o.at / (15 * 60_000)) * 15 * 60_000;
    const bucket = buckets.get(at) ?? new Map<string, Observation>();
    if ((bucket.get(o.account)?.at ?? 0) < o.at) bucket.set(o.account, o);
    buckets.set(at, bucket);
  }
  const result: Point[] = [];
  let previous = 0;
  for (const [at, bucket] of [...buckets].sort(([a], [b]) => a - b)) {
    if (previous && at - previous > MAX_GAP) result.push({ at: previous + 1, value: null });
    result.push({
      at,
      value: accounts.every((key) => bucket.has(key))
        ? accounts.reduce((s, key) => s + bucket.get(key)!.left, 0)
        : null,
    });
    previous = at;
  }
  return result;
}

/** One account is 100 percentage points. Rates are percentage points/hour, summed across the selected accounts. */
export function drainHistory(observations: Observation[], accounts: string[], since: number, until: number): Point[] {
  const hours = hourlyUsage(observations, since, until);
  const result: Point[] = [];
  for (let at = Math.floor(since / HOUR) * HOUR; at < until; at += HOUR) {
    const values = accounts.map((key) => hours.get(key)?.find((h) => h.at === at));
    // Brief observations are too noisy; each account must cover at least 15 minutes of this hour.
    result.push({
      at,
      value:
        values.length > 0 && values.every((h) => h && h.observedMs >= 15 * 60_000)
          ? values.reduce((s, h) => s + h!.rate, 0)
          : null,
    });
  }
  return result;
}

export function resetPeriod(label: string): number | null {
  if (label === "5-Hour") return 5 * HOUR;
  if (label.startsWith("Weekly")) return 7 * DAY;
  return null;
}

/** Constant observed per-account rates, clamped at zero, with a full refill at reported resets. No automatic credit use. */
export function forecast(current: Observation[], rates: AccountRate[], now: number, days = 7): Point[] | null {
  if (
    !current.length ||
    current.some(
      (o) =>
        now - o.at > MAX_GAP || !rates.some((r) => r.account === o.account && r.observedMs >= HOUR && r.intervals >= 3),
    )
  )
    return null;
  const state = current.map((o) => ({
    left: o.left,
    rate: rates.find((r) => r.account === o.account)!.rate,
    reset: o.resetsAt && o.resetsAt > now ? o.resetsAt : null,
    period: o.periodMs === undefined ? resetPeriod(o.label) : o.periodMs,
  }));
  const end = now + days * DAY;
  const times = new Set<number>([now, end]);
  for (let at = now + HOUR; at < end; at += HOUR) times.add(at);
  for (const account of state) {
    if (!account.reset) continue;
    for (let at = account.reset; at <= end; at += account.period ?? Infinity) times.add(at);
  }
  let previous = now;
  const sum = () => state.reduce((s, a) => s + a.left, 0);
  const result: Point[] = [{ at: now, value: sum() }];
  for (const at of [...times].sort((a, b) => a - b).slice(1)) {
    // Include the exact exhaustion instant; hourly endpoints alone would make a fast drain look slower.
    const exhaustion = state
      .filter((a) => a.rate > 0 && a.left > 0)
      .map((a) => previous + (a.left / a.rate) * HOUR)
      .filter((time) => time > previous && time < at);
    for (const time of [...new Set([...exhaustion, at])].sort((a, b) => a - b)) {
      for (const a of state) a.left = Math.max(0, a.left - (a.rate * (time - previous)) / HOUR);
      result.push({ at: time, value: sum() });
      previous = time;
    }
    let reset = false;
    for (const a of state) {
      if (a.reset === at) {
        a.left = 100;
        a.reset = a.period ? at + a.period : null;
        reset = true;
      }
    }
    if (reset) result.push({ at, value: sum() });
    previous = at;
  }
  return result;
}
