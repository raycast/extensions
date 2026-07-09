import { Color, Keyboard } from "@raycast/api";
import type { Task, Column, ProjectDetail } from "../types";

export function formatDate(date: string | null) {
  if (!date) return "N/A";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
}

export const formatShortDate = (date: string | null) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "N/A" : `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
};

export const cleanDescription = (description: string) => {
  return description?.length
    ? description
        .replace(/<p>/g, "")
        .replace(/<\/p>/g, "\n")
        .replace(/<br\s*\/?>/g, "\n")
    : "No description";
};

export const statusKey: Record<string, Keyboard.KeyEquivalent> = {
  backlog: "b",
  "to-do": "t",
  "in-progress": "p",
  "in-review": "r",
  done: "d",
};

export const priorityKey: Record<string, Keyboard.KeyEquivalent> = {
  "no-priority": "n",
  low: "l",
  medium: "m",
  high: "h",
  urgent: "u",
};

export const priorityColor: Record<string, string> = {
  "no-priority": Color.SecondaryText,
  low: Color.Blue,
  medium: Color.Yellow,
  high: Color.Orange,
  urgent: Color.Red,
};

export const columnPriorities: Array<{ id: string; name: string }> = [
  { id: "no-priority", name: "No priority" },
  { id: "low", name: "Low" },
  { id: "medium", name: "Medium" },
  { id: "high", name: "High" },
  { id: "urgent", name: "Urgent" },
];

const priorityOrder = ["urgent", "high", "medium", "low", "no-priority"];

export const sortTasksByPriority = (tasks: Task[]) => {
  return [...tasks].sort((a, b) => {
    const aPriority = a.priority || "no-priority";
    const bPriority = b.priority || "no-priority";

    const aIndex = priorityOrder.indexOf(aPriority);
    const bIndex = priorityOrder.indexOf(bPriority);

    const aOrder = aIndex === -1 ? priorityOrder.length : aIndex;
    const bOrder = bIndex === -1 ? priorityOrder.length : bIndex;

    return aOrder - bOrder;
  });
};

export const sortTasksByDueDate = (tasks: Task[]) => {
  return [...tasks].sort((a, b) => {
    const aDueDate = a.dueDate || "";
    const bDueDate = b.dueDate || "";
    return new Date(aDueDate).getTime() - new Date(bDueDate).getTime();
  });
};

export const dueDateColor = (date: string): Color => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  if (dueDate < today) {
    return Color.Red;
  } else if (dueDate <= threeDaysFromNow) {
    return Color.Orange;
  } else {
    return Color.Green;
  }
};

export const resolveColumns = (detail: ProjectDetail): Column[] => {
  return detail?.data?.columns ?? detail?.columns ?? [];
};
