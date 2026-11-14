import { getOpenAssignedWorkItems } from "./my-work-items";
import { isOpenStateGroup } from "./state-groups";

type Countable = {
  assigneeIds?: string[];
  createdBy?: string | null;
  state?: { group?: string } | null;
  priority?: string | null;
  targetDate?: string | null;
};

export type WorkItemCounts = {
  open: number;
  urgent: number;
  overdue: number;
  dueToday: number;
};

/** Today's calendar date in the user's time zone, as Plane stores due dates (`YYYY-MM-DD`). */
export function localDateString(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The calendar day (`YYYY-MM-DD`) of a Plane due date, or undefined without one. */
export function dueDay(targetDate: string | null | undefined): string | undefined {
  return targetDate ? targetDate.slice(0, 10) : undefined;
}

/**
 * True when an open work item's due day is before `today` (from `localDateString`). Compares calendar days,
 * so an item due today is not overdue until tomorrow. Completed and cancelled items are never overdue.
 */
export function isOverdue(
  item: { targetDate?: string | null; state?: { group?: string } | null },
  today: string,
): boolean {
  const day = dueDay(item.targetDate);
  return !!day && day < today && isOpenStateGroup(item.state?.group);
}

/** Counts the user's open assigned work items, and how many are urgent, overdue or due today. */
export function countWorkItems(items: Countable[], userId: string | undefined, today: string): WorkItemCounts {
  const open = getOpenAssignedWorkItems(items, userId);
  return {
    open: open.length,
    urgent: open.filter((item) => item.priority === "urgent").length,
    overdue: open.filter((item) => isOverdue(item, today)).length,
    dueToday: open.filter((item) => dueDay(item.targetDate) === today).length,
  };
}

/**
 * Root search subtitle, e.g. "12 open · 2 urgent · 1 overdue · 3 due today". Zero counts are left out.
 * `truncated` marks the open count as a lower bound ("12+ open").
 */
export function formatWorkItemsSubtitle(counts: WorkItemCounts, truncated = false): string {
  if (counts.open === 0) return truncated ? "None found in recent work items" : "Nothing open assigned to you";
  const parts = [`${counts.open}${truncated ? "+" : ""} open`];
  if (counts.urgent) parts.push(`${counts.urgent} urgent`);
  if (counts.overdue) parts.push(`${counts.overdue} overdue`);
  if (counts.dueToday) parts.push(`${counts.dueToday} due today`);
  return parts.join(" · ");
}
