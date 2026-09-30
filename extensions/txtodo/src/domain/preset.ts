import { endOfWeekDate, parseDueDate, startOfDay } from "./due";
import type { Task } from "./parser";

export type ViewPreset = "all" | "today" | "this-week" | "overdue" | "completed";

export const VIEW_PRESETS: ViewPreset[] = ["all", "today", "this-week", "overdue", "completed"];

export function isValidPreset(value: unknown): value is ViewPreset {
  return typeof value === "string" && (VIEW_PRESETS as string[]).includes(value);
}

export function applyPreset(tasks: Task[], preset: ViewPreset, now: Date): Task[] {
  if (preset === "completed") return tasks.filter((t) => t.completed);

  const active = tasks.filter((t) => !t.completed);
  if (preset === "all") return active;

  const today = startOfDay(now);
  const weekEnd = endOfWeekDate(now);

  return active.filter((t) => {
    const due = parseDueDate(t.metadata.due);
    if (!due) return false;
    const dueDay = startOfDay(due);
    switch (preset) {
      case "today":
        return dueDay.getTime() <= today.getTime();
      case "this-week":
        return dueDay.getTime() <= weekEnd.getTime();
      case "overdue":
        return dueDay.getTime() < today.getTime();
      default:
        return false;
    }
  });
}
