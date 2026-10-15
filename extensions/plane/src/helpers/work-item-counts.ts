import { getOpenAssignedWorkItems } from "./my-work-items";

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

/** Counts the user's open assigned work items, and how many are urgent, overdue or due today. */
export function countWorkItems(items: Countable[], userId: string | undefined, today: string): WorkItemCounts {
  const open = getOpenAssignedWorkItems(items, userId);
  const due = (item: Countable) => item.targetDate?.slice(0, 10);
  return {
    open: open.length,
    urgent: open.filter((item) => item.priority === "urgent").length,
    overdue: open.filter((item) => {
      const date = due(item);
      return !!date && date < today;
    }).length,
    dueToday: open.filter((item) => due(item) === today).length,
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
