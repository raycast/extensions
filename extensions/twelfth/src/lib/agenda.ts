import type { Action } from "./twelfth";

export type Bucket = "overdue" | "today" | "week" | "later" | "undated";

export const BUCKET_TITLES: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Due Today",
  week: "This Week",
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

export function bucketOf(action: Action, timeZone?: string | null, now = new Date()): Bucket {
  if (!action.dueAt) return "undated";
  const days = daysUntil(action.dueAt, timeZone, now);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  return "later";
}

export function groupActions(actions: Action[], timeZone?: string | null, now = new Date()) {
  const groups: Record<Bucket, Action[]> = { overdue: [], today: [], week: [], later: [], undated: [] };
  for (const action of actions) groups[bucketOf(action, timeZone, now)].push(action);
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
