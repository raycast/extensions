import { BusyEvent, DayPlan, Interval, Options } from "./types";

const DAY = 24 * 3600 * 1000;

export function firstMonday(now: Date, includeWeekend: boolean): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7;
  if (!includeWeekend && dow >= 5) d.setDate(d.getDate() + (7 - dow));
  else d.setDate(d.getDate() - dow);
  return d;
}

export function rangeFor(now: Date, opts: Options): { start: Date; end: Date } {
  const start = firstMonday(now, opts.includeWeekend);
  const end = new Date(start);
  end.setDate(end.getDate() + opts.weeks * 7);
  return { start, end };
}

export function buildPlan(events: BusyEvent[], now: Date, opts: Options): DayPlan[][] {
  const { start } = rangeFor(now, opts);
  const daysPerWeek = opts.includeWeekend ? 7 : 5;
  const weeks: DayPlan[][] = [];

  for (let w = 0; w < opts.weeks; w++) {
    const week: DayPlan[] = [];
    for (let i = 0; i < daysPerWeek; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + w * 7 + i);
      week.push(planDay(date, events, now, opts));
    }
    weeks.push(week);
  }
  return weeks;
}

function planDay(date: Date, events: BusyEvent[], now: Date, opts: Options): DayPlan {
  // Use the Date constructor instead of adding milliseconds so daylight saving changes are handled correctly.
  const at = (h: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), h).getTime();
  const windowStart = at(opts.startHour);
  const windowEnd = at(opts.endHour);
  const win = { start: windowStart, end: windowEnd };

  const hard: Interval[] = [];
  const soft: Interval[] = [];
  for (const ev of events) {
    const c = clip(ev, win);
    if (!c) continue;
    if (ev.tentative && !opts.tentativeIsBusy) continue;
    (ev.tentative ? soft : hard).push(c);
  }

  const busy = union(hard);
  const tentative = subtract(union(soft), busy);

  const nowMs = now.getTime();
  const past: Interval | null =
    nowMs >= windowEnd ? { ...win } : nowMs > windowStart ? { start: windowStart, end: ceilTo(nowMs, 15) } : null;

  const blocked = union([...busy, ...tentative, ...(past ? [past] : [])]);
  const free = subtract([win], blocked).filter((f) => f.end - f.start >= opts.minSlotMinutes * 60000);

  return { date, windowStart, windowEnd, busy, tentative, past, free };
}

function ceilTo(ms: number, minutes: number): number {
  const step = minutes * 60000;
  return Math.ceil(ms / step) * step;
}

function clip(iv: Interval, win: Interval): Interval | null {
  const start = Math.max(iv.start, win.start);
  const end = Math.min(iv.end, win.end);
  return end > start ? { start, end } : null;
}

export function union(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

/** Returns a without b. Both lists must be free of overlaps. */
export function subtract(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const iv of a) {
    let cursor = iv.start;
    for (const cut of b) {
      if (cut.end <= cursor) continue;
      if (cut.start >= iv.end) break;
      if (cut.start > cursor) out.push({ start: cursor, end: cut.start });
      cursor = Math.max(cursor, cut.end);
    }
    if (cursor < iv.end) out.push({ start: cursor, end: iv.end });
  }
  return out;
}

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart) / DAY + 1) / 7);
}
