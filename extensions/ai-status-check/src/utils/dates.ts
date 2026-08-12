const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function parseTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function formatRelativeTime(value: string | undefined, now = Date.now()): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;

  const differenceSeconds = Math.round((timestamp - now) / 1_000);
  const absoluteSeconds = Math.abs(differenceSeconds);
  if (absoluteSeconds < 60) return relativeTime.format(differenceSeconds, "second");

  const differenceMinutes = Math.round(differenceSeconds / 60);
  if (Math.abs(differenceMinutes) < 60) return relativeTime.format(differenceMinutes, "minute");

  const differenceHours = Math.round(differenceMinutes / 60);
  if (Math.abs(differenceHours) < 24) return relativeTime.format(differenceHours, "hour");

  const differenceDays = Math.round(differenceHours / 24);
  return relativeTime.format(differenceDays, "day");
}

export function formatDateTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
