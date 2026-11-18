import { isToday, isYesterday } from "date-fns";

export function formatDateTime(date: Date): string {
  const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;

  const timeFormatter = new Intl.DateTimeFormat(systemLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday(date)) {
    return `Today at ${timeFormatter.format(date)}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${timeFormatter.format(date)}`;
  }

  const dateFormatter = new Intl.DateTimeFormat(systemLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
