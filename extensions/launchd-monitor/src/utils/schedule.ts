import { JobSchedule } from "../api/types";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function computeNextRun(schedule: JobSchedule): Date {
  const now = new Date();
  const next = new Date(now);

  const hour = schedule.Hour ?? 0;
  const minute = schedule.Minute ?? 0;

  next.setHours(hour, minute, 0, 0);

  if (schedule.Weekday !== undefined) {
    // Weekly schedule — normalize Weekday 7 (launchd Sunday) to 0 (JS Sunday)
    const weekday = schedule.Weekday === 7 ? 0 : schedule.Weekday;
    const currentDay = now.getDay();
    let daysUntil = weekday - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && now >= next)) {
      daysUntil += 7;
    }
    next.setDate(next.getDate() + daysUntil);
  } else if (schedule.Day !== undefined) {
    // Monthly schedule — clamp day to last valid day of the target month
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
  const hour = schedule.Hour ?? 0;
  const minute = schedule.Minute ?? 0;
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const timeStr = `${h}:${String(minute).padStart(2, "0")} ${period}`;

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
