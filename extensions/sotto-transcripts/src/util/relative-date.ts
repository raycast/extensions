const TIME_FMT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const WEEKDAY_FMT = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const SHORT_DATE_FMT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const FULL_DATE_FMT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export function formatRelativeDate(d: Date | null, now: Date = new Date()): string {
  if (!d) return "Unknown";
  const diff = now.getTime() - d.getTime();

  if (diff < MS_PER_MINUTE) return "Just now";
  if (diff < MS_PER_HOUR) {
    const m = Math.floor(diff / MS_PER_MINUTE);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }

  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    const h = Math.floor(diff / MS_PER_HOUR);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${TIME_FMT.format(d)}`;
  }

  if (diff < 7 * MS_PER_DAY) {
    return `${WEEKDAY_FMT.format(d)} at ${TIME_FMT.format(d)}`;
  }

  if (d.getFullYear() === now.getFullYear()) {
    return `${SHORT_DATE_FMT.format(d)} at ${TIME_FMT.format(d)}`;
  }

  return FULL_DATE_FMT.format(d);
}
