import { ShowWatchTime } from "../interface/show-watch-time";

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

export function getTotalMinutes(watchTime: ShowWatchTime): number {
  const days = watchTime.days ?? 0;
  const hours = watchTime.hours ?? 0;
  const minutes = watchTime.minutes ?? 0;

  return days * 24 * 60 + hours * 60 + minutes;
}

export function formatWatchTimeCompact(watchTime: ShowWatchTime): string {
  const days = watchTime.days ?? 0;
  const hours = watchTime.hours ?? 0;
  const minutes = watchTime.minutes ?? 0;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
}

export function formatWatchTimeDetailed(watchTime: ShowWatchTime): string {
  const days = watchTime.days ?? 0;
  const hours = watchTime.hours ?? 0;
  const minutes = watchTime.minutes ?? 0;

  if (days === 0 && hours === 0 && minutes === 0) {
    return "No watch time found";
  }

  const parts: string[] = [];

  if (days > 0) {
    parts.push(pluralize(days, "day"));
  }

  if (hours > 0) {
    parts.push(pluralize(hours, "hour"));
  }

  if (minutes > 0) {
    parts.push(pluralize(minutes, "minute"));
  }

  return parts.join(" ");
}

export function formatHoursFromMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return "0.0";
  }

  return (totalMinutes / 60).toFixed(1);
}
