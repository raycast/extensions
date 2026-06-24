import { Color, Icon } from "@raycast/api";
import { Priority, Todo } from "./types";

// Build a local ISO-8601 string with timezone offset, e.g. 2026-06-25T18:00:00+08:00.
// The jovida CLI treats this as a precise deadline.
export function toLocalISO(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const oh = pad(Math.floor(Math.abs(off) / 60));
  const om = pad(Math.abs(off) % 60);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${oh}:${om}`
  );
}

// A bare local date, e.g. 2026-06-25. The CLI treats this as "belongs to that day".
export function toLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// True when `when` is a bare date (day-belonging) rather than a timed deadline.
export function isAllDay(when?: string): boolean {
  return Boolean(when) && !/T\d/.test(when!);
}

export function priorityIcon(
  priority?: Priority,
): { source: Icon; tintColor: Color } | undefined {
  switch (priority) {
    case "high":
      return { source: Icon.Exclamationmark, tintColor: Color.Red };
    case "medium":
      return { source: Icon.Circle, tintColor: Color.Orange };
    case "low":
      return { source: Icon.Circle, tintColor: Color.Blue };
    default:
      return undefined;
  }
}

// Human-friendly due label for list accessories.
export function formatWhen(when?: string): string | undefined {
  if (!when) return undefined;
  const d = new Date(when);
  if (isNaN(d.getTime())) return when;
  const allDay = isAllDay(when);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const datePart = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  if (allDay) return datePart;
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
}

export function subtaskProgress(todo: Todo): string | undefined {
  const subs = todo.subtasks ?? [];
  if (subs.length === 0) return undefined;
  const done = subs.filter((s) => s.completed).length;
  return `${done}/${subs.length}`;
}

export type TimeBucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "future"
  | "anytime";

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Bucket a todo by its `when` relative to the local calendar day.
export function timeBucket(when?: string): TimeBucket {
  if (!when) return "anytime";
  const d = new Date(when);
  if (isNaN(d.getTime())) return "anytime";
  const today = dayStart(new Date());
  const wd = dayStart(d);
  const oneDay = 86_400_000;
  if (wd < today) return "overdue";
  if (wd === today) return "today";
  if (wd === today + oneDay) return "tomorrow";
  return "future";
}

export const BUCKET_TITLE: Record<TimeBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  future: "Later",
  anytime: "Anytime",
};

// Short label for a todo's reminders, e.g. "Jun 30 09:00" or "09:00 +1".
export function formatReminders(remindAt?: string[]): string | undefined {
  if (!remindAt || remindAt.length === 0) return undefined;
  const first = formatWhen(remindAt[0]);
  if (!first) return undefined;
  return remindAt.length > 1 ? `${first} +${remindAt.length - 1}` : first;
}
