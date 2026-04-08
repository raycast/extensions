import type { Task } from "../types/vikunja";

function getDateKey(date: Date, timeZone?: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}-${month}-${day}`;
}

export function formatDateTime(date?: string, timeZone?: string) {
  if (!date) {
    return undefined;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(parsedDate);
}

export function getDueKind(task: Task, timeZone?: string) {
  if (!task.due_date) {
    return "none" as const;
  }

  if (task.done) {
    return "completed" as const;
  }

  const dueDate = new Date(task.due_date);

  if (Number.isNaN(dueDate.getTime())) {
    return "none" as const;
  }

  const dueKey = getDateKey(dueDate, timeZone);
  const todayKey = getDateKey(new Date(), timeZone);

  if (dueKey < todayKey) {
    return "overdue" as const;
  }

  if (dueKey === todayKey) {
    return "today" as const;
  }

  return "upcoming" as const;
}

export function isDueTodayOrOverdue(task: Task, timeZone?: string) {
  const dueKind = getDueKind(task, timeZone);
  return dueKind === "today" || dueKind === "overdue";
}

export function toApiDate(date?: Date | null) {
  return date ? date.toISOString() : undefined;
}
