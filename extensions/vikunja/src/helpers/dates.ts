import { Color } from "@raycast/api";

/** Vikunja returns "0001-01-01T00:00:00Z" for unset dates — normalize to null */
export function normalizeDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (d.getFullYear() <= 1) return null;
  return date;
}

export function formatDueDate(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  if (date.getFullYear() <= 1) return undefined;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function dueDateColor(dueDate: string | null): Color | undefined {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  if (date.getFullYear() <= 1) return undefined;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return Color.Red;
  if (days <= 1) return Color.Orange;
  if (days <= 3) return Color.Yellow;
  return undefined;
}
