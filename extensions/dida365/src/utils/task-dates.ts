import type { Task } from "../types.js";
import { didaTimeZone } from "./timezone.js";

export function parseTaskDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isTodayTask(task: Task, timeZone = didaTimeZone()): boolean {
  const date = parseTaskDate(task.dueDate);
  return Boolean(date && isSameDateInTimeZone(date, new Date(), timeZone));
}

function isSameDateInTimeZone(a: Date, b: Date, timeZone: string): boolean {
  return dateKey(a, timeZone) === dateKey(b, timeZone);
}

function dateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
