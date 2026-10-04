import type { Action } from "./twelfth";

export type Bucket = "overdue" | "today" | "week" | "next" | "later" | "undated";
export type WeekStart = "monday" | "sunday";

export const BUCKET_TITLES: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Due Today",
  week: "This Week",
  next: "Next Week",
  later: "Later",
  undated: "No Due Date",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The workspace's timezone if Intl accepts it, else the machine's own: an empty or unknown zone would throw. */
function validZone(timeZone?: string | null): string | undefined {
  if (!timeZone) return undefined;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
}

/** A YYYY-MM-DD calendar date in the workspace's timezone, so "today" is the buyer's today. */
export function localDate(at: Date, timeZone?: string | null): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: validZone(timeZone), dateStyle: "short" }).format(at);
}

/** Whole calendar days from today to the action's due date: negative is overdue. */
export function daysUntil(dueAt: string, timeZone?: string | null, now = new Date()): number {
  const due = Date.parse(localDate(new Date(dueAt), timeZone));
  const today = Date.parse(localDate(now, timeZone));
  return Math.round((due - today) / DAY_MS);
}

/** Days from today to the last day of this calendar week, by the person's week start in the app. */
export function daysLeftInWeek(timeZone?: string | null, now = new Date(), weekStart: WeekStart = "monday"): number {
  const weekday = new Date(`${localDate(now, timeZone)}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return weekStart === "monday" ? (7 - weekday) % 7 : 6 - weekday;
}

export function bucketOf(
  action: Action,
  timeZone?: string | null,
  now = new Date(),
  weekStart: WeekStart = "monday",
): Bucket {
  if (!action.dueAt) return "undated";
  const days = daysUntil(action.dueAt, timeZone, now);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  const left = daysLeftInWeek(timeZone, now, weekStart);
  if (days <= left) return "week";
  if (days <= left + 7) return "next";
  return "later";
}

export function groupActions(
  actions: Action[],
  timeZone?: string | null,
  now = new Date(),
  weekStart: WeekStart = "monday",
) {
  const groups: Record<Bucket, Action[]> = { overdue: [], today: [], week: [], next: [], later: [], undated: [] };
  for (const action of actions) groups[bucketOf(action, timeZone, now, weekStart)].push(action);
  return groups;
}

export function dueLabel(action: Action, timeZone?: string | null, now = new Date()): string | undefined {
  if (!action.dueAt) return undefined;
  const days = daysUntil(action.dueAt, timeZone, now);
  if (days < -1) return `${-days} days overdue`;
  if (days === -1) return "Due yesterday";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  const zone = validZone(timeZone);
  if (days <= 7) {
    return new Intl.DateTimeFormat("en-AU", { weekday: "long", timeZone: zone }).format(new Date(action.dueAt));
  }
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: zone }).format(
    new Date(action.dueAt),
  );
}

/** Mine = assigned to me, or to nobody (a workspace task anyone can pick up). */
export function isMine(action: Action, email: string | undefined): boolean {
  if (!email) return true;
  return !action.assigneeEmail || action.assigneeEmail.toLowerCase() === email;
}
