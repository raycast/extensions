import type { AnyDoTask } from "./types";

export type Bucket =
  "Overdue" | "Today" | "Tomorrow" | "This Week" | "Later" | "No Date";

export const BUCKET_ORDER: Bucket[] = [
  "Overdue",
  "Today",
  "Tomorrow",
  "This Week",
  "Later",
  "No Date",
];

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function dueDate(task: AnyDoTask): Date | null {
  if (task.datetime) {
    const parsed = new Date(task.datetime);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (task.date) {
    const parsed = new Date(`${task.date}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function bucketOf(task: AnyDoTask, now: Date = new Date()): Bucket {
  const due = dueDate(task);
  if (!due) return "No Date";
  const today = startOfDay(now);
  if (due < today) return "Overdue";
  const days = Math.round(
    (startOfDay(due).getTime() - today.getTime()) / 86_400_000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return "This Week";
  return "Later";
}

/** Local ISO-8601 without an offset: the MCP server interprets it in the user's Any.do timezone. */
export function toLocalIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function formatDue(task: AnyDoTask): string | null {
  const due = dueDate(task);
  if (!due) return null;
  const day = due.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
  if (!task.datetime) return day;
  return `${day} ${due.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export interface ReminderOption {
  title: string;
  date: Date | null;
}

export function reminderOptions(
  base: Date | null,
  now: Date = new Date(),
): ReminderOption[] {
  const options: ReminderOption[] = [
    { title: "No reminder", date: null },
    { title: "In 1 hour", date: new Date(now.getTime() + 3_600_000) },
    { title: "In 3 hours", date: new Date(now.getTime() + 3 * 3_600_000) },
    {
      title: "Tomorrow at 09:00",
      date: (() => {
        const tomorrow = addDays(startOfDay(now), 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      })(),
    },
  ];

  if (base) {
    options.splice(1, 0, { title: "At due time", date: base });
    options.push({
      title: "10 minutes before",
      date: new Date(base.getTime() - 600_000),
    });
    options.push({
      title: "1 hour before",
      date: new Date(base.getTime() - 3_600_000),
    });
  }

  return options;
}

export function reminderLabel(date: Date): string {
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
