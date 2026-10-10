import { dateOfDayKey } from "./streaks.ts";

export function splitDuration(minutes: number): { value: string; unit: string } {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return { value: String(rem), unit: "m" };
  if (rem === 0) return { value: String(h), unit: "h" };
  return { value: `${h}h ${rem}`, unit: "m" };
}

export function formatDuration(minutes: number): string {
  const { value, unit } = splitDuration(minutes);
  return `${value}${unit}`;
}

const toDate = (value: number | string | Date): Date =>
  value instanceof Date ? value : typeof value === "string" ? dateOfDayKey(value) : new Date(value);

export function formatDay(value: number | string | Date): string {
  return toDate(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDayLong(value: number | string | Date): string {
  return toDate(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(value: number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

export function truncate(text: string, max: number): string {
  const chars = [...text.replace(/\s+/g, " ").trim()];
  if (chars.length <= max) return chars.join("");
  const head = chars.slice(0, max - 1).join("");
  return `${head.trimEnd()}…`;
}
