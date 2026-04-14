import { Color } from "@raycast/api";
import { TaskStatus } from "./types";

export const STATUS_COLORS: Record<TaskStatus, Color> = {
  active: Color.Blue,
  done: Color.Green,
  delayed: Color.Orange,
  snoozed: Color.Yellow,
  waiting: Color.Purple,
  cancelled: Color.SecondaryText,
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  active: "Active",
  done: "Done",
  delayed: "Delayed",
  snoozed: "Snoozed",
  waiting: "Waiting",
  cancelled: "Cancelled",
};

export function formatDueDate(
  dateString: string | null | undefined,
): string | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays}d`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
