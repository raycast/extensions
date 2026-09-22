export const SHIELDS_PER_WEEK = 2;

export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function startOfWeek(d: Date, weekStartsOn: 0 | 1): Date {
  const out = startOfDay(d);
  const shift = (out.getDay() - weekStartsOn + 7) % 7;
  out.setDate(out.getDate() - shift);
  return out;
}

export function dateOfDayKey(key: string, shiftDays = 0): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d + shiftDays);
}

export function shiftDayKey(key: string, days: number): string {
  return dayKey(dateOfDayKey(key, days));
}

function daySpan(from: string, to: string): number | null {
  const a = dateOfDayKey(from).getTime();
  const b = dateOfDayKey(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 86_400_000);
}

function shieldLedger(weekStartsOn: 0 | 1) {
  const spent = new Map<string, number>();
  const weekOf = (key: string) => dayKey(startOfWeek(dateOfDayKey(key), weekStartsOn));
  return {
    spend(key: string): boolean {
      const week = weekOf(key);
      const used = spent.get(week) ?? 0;
      if (used >= SHIELDS_PER_WEEK) return false;
      spent.set(week, used + 1);
      return true;
    },
    refund(key: string): void {
      const week = weekOf(key);
      spent.set(week, Math.max(0, (spent.get(week) ?? 0) - 1));
    },
    spentInWeekOf(key: string): number {
      return spent.get(weekOf(key)) ?? 0;
    },
  };
}

export type StreakWalk = {
  current: number;
  best: number;
  bestStart: number | null;
  bestEnd: number | null;
  shieldedDays: Set<string>;
  shieldsLeft: number;
};

export const WALK_HORIZON_DAYS = 100 * 366;

function walkable(key: string, now: Date): boolean {
  const at = dateOfDayKey(key).getTime();
  if (!Number.isFinite(at)) return false;
  return Math.abs(at - startOfDay(now).getTime()) <= WALK_HORIZON_DAYS * 86_400_000;
}

export function walkStreaks(activeDayKeys: string[], weekStartsOn: 0 | 1, now: Date): StreakWalk {
  const keys = activeDayKeys.filter((key) => walkable(key, now));
  const active = new Set(keys);
  const best = bestRun(active, keys, weekStartsOn);
  const live = liveRun(active, keys, weekStartsOn, now);
  return {
    current: live.current,
    best: best.length,
    bestStart: best.start === null ? null : dateOfDayKey(best.start).getTime(),
    bestEnd: best.end === null ? null : dateOfDayKey(best.end).getTime(),
    shieldedDays: live.shieldedDays,
    shieldsLeft: live.shieldsLeft,
  };
}

function bestRun(active: Set<string>, keys: string[], weekStartsOn: 0 | 1) {
  let length = 0;
  let start: string | null = null;
  let end: string | null = null;
  if (!keys.length) return { length, start, end };

  const span = daySpan(keys[0], keys[keys.length - 1]);
  if (span === null) return { length, start, end };

  const shields = shieldLedger(weekStartsOn);
  let run = 0;
  let runStart: string | null = null;
  let key = keys[0];
  for (let day = 0; day <= span; day += 1, key = shiftDayKey(key, 1)) {
    if (active.has(key)) {
      if (run === 0) runStart = key;
      run += 1;
      if (run > length) {
        length = run;
        start = runStart;
        end = key;
      }
    } else if (!shields.spend(key)) {
      run = 0;
      runStart = null;
    }
  }
  return { length, start, end };
}

function liveRun(active: Set<string>, keys: string[], weekStartsOn: 0 | 1, now: Date) {
  const shields = shieldLedger(weekStartsOn);
  const shieldedDays = new Set<string>();
  let current = 0;

  if (keys.length) {
    const first = keys[0];
    let key = dayKey(now);
    if (!active.has(key)) key = shiftDayKey(key, -1);
    let bridging: string[] = [];
    while (key >= first) {
      if (active.has(key)) {
        current += 1;
        for (const day of bridging) shieldedDays.add(day);
        bridging = [];
      } else if (shields.spend(key)) bridging.push(key);
      else break;
      key = shiftDayKey(key, -1);
    }
    for (const day of bridging) shields.refund(day);
  }

  const today = dayKey(now);
  const todayCosts = keys.length && !active.has(today) && today >= keys[0] ? 1 : 0;

  return {
    current,
    shieldedDays,
    shieldsLeft: Math.max(0, SHIELDS_PER_WEEK - shields.spentInWeekOf(today) - todayCosts),
  };
}
