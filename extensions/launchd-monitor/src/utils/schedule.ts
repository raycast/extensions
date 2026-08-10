import { JobSchedule, CalendarSchedule, IntervalSchedule } from "../api/types";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computeNextRun(
  schedule: JobSchedule,
  lastRunTime?: Date | null,
): Date {
  if (schedule.type === "interval") {
    const base = lastRunTime ?? new Date();
    return new Date(base.getTime() + schedule.seconds * 1000);
  }
  return computeCalendarNextRun(schedule);
}

function computeCalendarNextRun(schedule: CalendarSchedule): Date {
  const now = new Date();
  const next = new Date(now);

  const hour = schedule.Hour ?? 0;
  const minute = schedule.Minute ?? 0;

  next.setHours(hour, minute, 0, 0);

  if (schedule.Weekday !== undefined) {
    // Weekly schedule. launchd accepts both 0 and 7 for Sunday; JS Date#getDay()
    // uses 0 for Sunday, so normalize 7 → 0.
    const weekday = schedule.Weekday === 7 ? 0 : schedule.Weekday;
    const currentDay = now.getDay();
    let daysUntil = weekday - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && now >= next)) {
      daysUntil += 7;
    }
    next.setDate(next.getDate() + daysUntil);
  } else if (schedule.Day !== undefined) {
    // Monthly/yearly schedule — clamp Day to last valid day of the target month
    // to avoid Date setter overflow (e.g. April 31 → May 1).
    const clampDay = (year: number, month: number, day: number) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return Math.min(day, lastDay);
    };
    if (schedule.Month !== undefined) {
      const m = schedule.Month - 1; // plist months are 1-indexed
      const d = clampDay(next.getFullYear(), m, schedule.Day);
      next.setMonth(m, d);
    } else {
      const d = clampDay(next.getFullYear(), next.getMonth(), schedule.Day);
      next.setDate(d);
    }
    if (now >= next) {
      if (schedule.Month !== undefined) {
        next.setFullYear(next.getFullYear() + 1);
      } else {
        const nextMonth = next.getMonth() + 1;
        const d = clampDay(next.getFullYear(), nextMonth, schedule.Day);
        next.setMonth(nextMonth, d);
      }
    }
  } else {
    // Daily schedule
    if (now >= next) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

export function describeSchedule(schedule: JobSchedule): string {
  if (schedule.type === "interval") {
    return describeInterval(schedule.seconds);
  }
  return describeCalendar(schedule);
}

/**
 * Render an array of schedules with weekday compaction. Calendar schedules
 * that share the same time-of-day and (Day, Month) are grouped, and their
 * weekday set is rendered as "Every weekday", "Mon–Fri", "Mon, Wed, Fri",
 * etc.
 */
export function describeSchedules(schedules: JobSchedule[]): string {
  if (schedules.length === 0) return "";

  const intervals = schedules.filter(
    (s): s is IntervalSchedule => s.type === "interval",
  );
  const calendars = schedules.filter(
    (s): s is CalendarSchedule => s.type === "calendar",
  );

  // Group calendar schedules whose only difference is Weekday.
  const groups = new Map<
    string,
    { sample: CalendarSchedule; weekdays: Set<number> }
  >();
  const ungrouped: CalendarSchedule[] = [];
  for (const c of calendars) {
    if (c.Weekday === undefined) {
      ungrouped.push(c);
      continue;
    }
    const key = `${c.Hour ?? 0}:${c.Minute ?? 0}:${c.Day ?? ""}:${c.Month ?? ""}`;
    const weekday = c.Weekday === 7 ? 0 : c.Weekday;
    const existing = groups.get(key);
    if (existing) {
      existing.weekdays.add(weekday);
    } else {
      groups.set(key, { sample: c, weekdays: new Set([weekday]) });
    }
  }

  const parts: string[] = [];
  for (const interval of intervals)
    parts.push(describeInterval(interval.seconds));
  for (const { sample, weekdays } of groups.values()) {
    parts.push(`${formatWeekdaySet(weekdays)} at ${formatTime(sample)}`);
  }
  for (const c of ungrouped) parts.push(describeCalendar(c));
  return parts.join("; ");
}

function describeInterval(seconds: number): string {
  if (seconds < 60 || seconds % 60 !== 0) {
    return seconds === 1 ? "Every second" : `Every ${seconds} seconds`;
  }
  const minutes = seconds / 60;
  if (minutes < 60 || minutes % 60 !== 0) {
    return minutes === 1 ? "Every minute" : `Every ${minutes} minutes`;
  }
  const hours = minutes / 60;
  return hours === 1 ? "Every hour" : `Every ${hours} hours`;
}

function formatTime(schedule: CalendarSchedule): string {
  const hour = schedule.Hour ?? 0;
  const minute = schedule.Minute ?? 0;
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, "0")} ${period}`;
}

function formatWeekdaySet(weekdays: Set<number>): string {
  const days = [...weekdays].sort((a, b) => a - b);
  const set = new Set(days);

  // Named patterns
  if (days.length === 7) return "Every day";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) {
    return "Every weekday";
  }
  if (days.length === 2 && set.has(0) && set.has(6)) return "Every weekend";

  // Single day → "Mon". (The standalone "Every Monday" form is reserved for
  // describeSchedule(); within describeSchedules() short forms read better
  // alongside other groups.)
  if (days.length === 1) return WEEKDAY_SHORT[days[0]];

  // Contiguous range → "Mon–Wed"
  const isContiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (isContiguous) {
    return `${WEEKDAY_SHORT[days[0]]}\u2013${WEEKDAY_SHORT[days[days.length - 1]]}`;
  }

  // Non-contiguous → "Mon, Wed, Fri"
  return days.map((d) => WEEKDAY_SHORT[d]).join(", ");
}

function describeCalendar(schedule: CalendarSchedule): string {
  const timeStr = formatTime(schedule);

  if (schedule.Weekday !== undefined) {
    const weekday = schedule.Weekday === 7 ? 0 : schedule.Weekday;
    const dayName = WEEKDAY_NAMES[weekday] ?? `Day ${schedule.Weekday}`;
    return `Every ${dayName} at ${timeStr}`;
  }

  if (schedule.Day !== undefined) {
    if (schedule.Month !== undefined) {
      return `${schedule.Month}/${schedule.Day} at ${timeStr}`;
    }
    return `Monthly on day ${schedule.Day} at ${timeStr}`;
  }

  return `Daily at ${timeStr}`;
}
