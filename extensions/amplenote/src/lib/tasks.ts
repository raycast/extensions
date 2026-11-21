import { nowSeconds, Task } from "./api";

export type TaskGroup = "overdue" | "today" | "upcoming" | "unscheduled";

export const taskGroupTitles: Record<TaskGroup, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  unscheduled: "Unscheduled",
};

function endOfDay(seconds: number): number {
  const end = new Date(seconds * 1000);
  end.setHours(23, 59, 59, 999);
  return Math.floor(end.getTime() / 1000);
}

export function taskGroup(task: Task, now = nowSeconds()): TaskGroup {
  const todayEnds = endOfDay(now);
  if (task.deadline && task.deadline < now) return "overdue";
  if ((task.startAt && task.startAt <= todayEnds) || (task.deadline && task.deadline <= todayEnds)) return "today";
  if (task.startAt || task.deadline) return "upcoming";
  return "unscheduled";
}

export function isHidden(task: Task, now = nowSeconds()): boolean {
  return !!task.hideUntil && task.hideUntil > now;
}

export function isOpen(task: Task): boolean {
  return !task.completedAt && !task.dismissedAt;
}

const UUID_LINK = /\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\]\([^)]*\)/gi;

export function taskReferenceCount(content: string | null): number {
  return content?.match(UUID_LINK)?.length ?? 0;
}

export function taskTitle(content: string | null): string {
  if (!content) return "Untitled task";
  const text = content
    .replace(UUID_LINK, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`#>]/g, "")
    .replace(/\\([[\]()-])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text || "Untitled task";
}

export function dayLabel(seconds: number): string {
  const date = new Date(seconds * 1000);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function formatTimestamp(seconds: number): string {
  const date = new Date(seconds * 1000);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}
