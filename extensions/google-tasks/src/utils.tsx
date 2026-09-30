import { Color, Icon } from "@raycast/api";
import { Task } from "./types";

export const defaultListKey = "task-default-list-v1";

export function isCompleted(task: Task): boolean {
  return task.status === "completed";
}

export function dueDay(value?: string): string | undefined {
  return value?.slice(0, 10);
}

export function todayValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function getIcon(task: Task): { source: Icon; tintColor?: Color } {
  const completed = isCompleted(task);
  const due = dueDay(task.due);
  if (!completed && due && due < todayValue()) {
    return { source: Icon.Circle, tintColor: Color.Red };
  }
  if (completed) {
    return { source: Icon.Checkmark, tintColor: Color.Green };
  }
  return { source: Icon.Circle };
}
