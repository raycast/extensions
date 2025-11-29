import { formatDate, formatDuration } from "../bamboo/api";

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function formatDateLabel(
  dateString: string,
  totalDurationMs?: number,
): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const today = formatDate(new Date());
  if (dateString === today) {
    if (totalDurationMs === undefined) {
      return "Today";
    }
    const durationText = formatDuration(totalDurationMs);
    return `Today • ${durationText}`;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const base = formatter.format(date);
  if (totalDurationMs === undefined) {
    return base;
  }

  const durationText = formatDuration(totalDurationMs);
  return `${base} • ${durationText}`;
}

export const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export function toNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === null) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}
