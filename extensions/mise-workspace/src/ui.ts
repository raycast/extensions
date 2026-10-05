import { Color, Icon } from "@raycast/api";

import type { TaskLite } from "./types";

const ICON_DONE = { source: Icon.CheckCircle, tintColor: Color.Green } as const;
const ICON_REVIEW = { source: Icon.Circle, tintColor: Color.Purple } as const;
const ICON_PROGRESS = { source: Icon.Circle, tintColor: Color.Blue } as const;
const ICON_TODO = {
  source: Icon.Circle,
  tintColor: Color.SecondaryText,
} as const;

export function statusIconFor(task: Pick<TaskLite, "_id" | "status">) {
  switch (task.status) {
    case "done":
      return ICON_DONE;
    case "review":
      return ICON_REVIEW;
    case "progress":
      return ICON_PROGRESS;
    case "todo":
    default:
      return ICON_TODO;
  }
}

export function formatDue(ts?: number | null): string | undefined {
  if (!ts) return undefined;
  const oneDay = 24 * 60 * 60 * 1000;
  const startOfDay = (d: Date) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  };
  const due = startOfDay(new Date(ts));
  const today = startOfDay(new Date());
  const diffDays = Math.round((due.getTime() - today.getTime()) / oneDay);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (Math.abs(diffDays) <= 7) return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function subtasksAccessoryFor(task: Pick<TaskLite, "hasSubtasks" | "subtasksCompleted" | "subtasksTotal">) {
  if (!task.hasSubtasks) return undefined;
  if (typeof task.subtasksCompleted === "number" && typeof task.subtasksTotal === "number") {
    return {
      icon: Icon.CheckList,
      text: `${task.subtasksCompleted}/${task.subtasksTotal}`,
    } as const;
  }
  return { icon: Icon.CheckList, text: "Subtasks" } as const;
}
