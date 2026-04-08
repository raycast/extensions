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
    // Weekly schedule
    const currentDay = now.getDay();
    let daysUntil = schedule.Weekday - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && now >= next)) {
      daysUntil += 7;
    }
    next.setDate(next.getDate() + daysUntil);
  } else if (schedule.Day !== undefined) {
    // Monthly schedule — set month before day to avoid day overflow
    if (schedule.Month !== undefined) {
      next.setMonth(schedule.Month - 1, schedule.Day); // plist months are 1-indexed
    } else {
      next.setDate(schedule.Day);
    }
    if (now >= next) {
      if (schedule.Month !== undefined) {
        next.setFullYear(next.getFullYear() + 1);
      } else {
        next.setMonth(next.getMonth() + 1, schedule.Day);
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
    const dayName =
      WEEKDAY_NAMES[schedule.Weekday] ?? `Day ${schedule.Weekday}`;
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
