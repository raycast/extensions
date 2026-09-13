const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;
const MONTH = DAY * 30;

/** Seconds elapsed since an ISO 8601 timestamp; 0 if unparseable. */
function secondsSince(iso: string, now: Date): number {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, (now.getTime() - parsed) / 1000);
}

/** Short age: 45m, 3h, 2d, 3mo */
export function age(iso: string, now: Date): string {
  const seconds = secondsSince(iso, now);
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h`;
  if (seconds < MONTH) return `${Math.floor(seconds / DAY)}d`;
  return `${Math.floor(seconds / MONTH)}mo`;
}

/** Spelled-out age. "3h" reads fine on screen but not in a tooltip. */
export function spokenAge(iso: string, now: Date): string {
  const seconds = secondsSince(iso, now);
  let value: number;
  let unit: string;
  if (seconds < HOUR) {
    value = Math.floor(seconds / MINUTE);
    unit = "minute";
  } else if (seconds < DAY) {
    value = Math.floor(seconds / HOUR);
    unit = "hour";
  } else if (seconds < MONTH) {
    value = Math.floor(seconds / DAY);
    unit = "day";
  } else {
    value = Math.floor(seconds / MONTH);
    unit = "month";
  }
  return `${value} ${unit}${value === 1 ? "" : "s"} old`;
}

/** 4911 -> "4,911" */
export function grouped(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Local 24-hour time, "13:05" — used to say how stale the data is. */
export function clock(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}
