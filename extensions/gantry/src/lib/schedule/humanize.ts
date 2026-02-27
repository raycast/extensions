import type { CalendarInterval, PlistConfig } from "../types";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatTime12h(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

function weekdayName(weekday: number): string {
  const normalized = weekday === 7 ? 0 : weekday;
  return WEEKDAY_NAMES[normalized] ?? `Day${weekday}`;
}

function humanizeInterval(interval: CalendarInterval): string {
  const hasMonth = interval.Month !== undefined;
  const hasDay = interval.Day !== undefined;
  const hasWeekday = interval.Weekday !== undefined;
  const hasHour = interval.Hour !== undefined;
  const hasMinute = interval.Minute !== undefined;

  const timeStr =
    hasHour && hasMinute
      ? formatTime12h(interval.Hour!, interval.Minute!)
      : hasHour
        ? formatTime12h(interval.Hour!, 0)
        : null;

  if (hasMonth && hasDay) {
    const monthName =
      MONTH_NAMES[interval.Month! - 1] ?? `Month${interval.Month}`;
    const base = `${monthName} ${interval.Day}`;
    return timeStr ? `${base} at ${timeStr}` : base;
  }

  if (hasDay && !hasWeekday) {
    const base = `Monthly on day ${interval.Day}`;
    return timeStr ? `${base} at ${timeStr}` : base;
  }

  if (hasWeekday && !hasDay) {
    const name = weekdayName(interval.Weekday!);
    if (timeStr) {
      return `${name} at ${timeStr}`;
    }
    return `Every ${name}`;
  }

  if (hasDay && hasWeekday) {
    const name = weekdayName(interval.Weekday!);
    const base = `Day ${interval.Day} or ${name}`;
    return timeStr ? `${base} at ${timeStr}` : base;
  }

  if (hasHour && hasMinute) {
    return `Daily at ${timeStr}`;
  }

  if (hasHour) {
    return `Daily at ${timeStr}`;
  }

  if (hasMinute) {
    return `Hourly at :${interval.Minute!.toString().padStart(2, "0")}`;
  }

  return "Every minute";
}

function humanizeDuration(seconds: number): string {
  if (seconds <= 0) return `${seconds}s`;

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (seconds % 86400 === 0) {
    return days === 1 ? "1 day" : `${days} days`;
  }

  if (seconds % 3600 === 0) {
    return `${hours + days * 24}h`;
  }

  if (seconds % 60 === 0) {
    return `${minutes + hours * 60 + days * 1440}m`;
  }

  if (days > 0) {
    return hours > 0 ? `${days} days ${hours}h` : `${days} days ${minutes}m`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }

  return `${secs}s`;
}

export function humanizeSchedule(config: PlistConfig): string {
  if (config.StartInterval !== undefined) {
    return `Every ${humanizeDuration(config.StartInterval)}`;
  }

  if (config.StartCalendarInterval !== undefined) {
    const intervals = Array.isArray(config.StartCalendarInterval)
      ? config.StartCalendarInterval
      : [config.StartCalendarInterval];

    return intervals.map(humanizeInterval).join(" or ");
  }

  if (config.RunAtLoad) {
    return "On load only";
  }

  return "On demand";
}
