import { Color, Image, Keyboard } from "@raycast/api";
import { TaskWithPullRequest } from "./services/copilot";

export function getTaskIcon(taskWithPullRequest: TaskWithPullRequest): Image.ImageLike {
  const source = getTaskIconPath(taskWithPullRequest);

  return { source, tintColor: Color.PrimaryText };
}

export function getTaskIconPath(taskWithPullRequest: TaskWithPullRequest): string {
  const status = taskWithPullRequest.task.status;

  if (status === "queued") {
    return "clock.svg";
  } else if (status === "in_progress") {
    return "sync.svg";
  } else if (status === "failed") {
    return "stop.svg";
  } else if (status === "timed_out") {
    return "stop.svg";
  } else if (status === "cancelled") {
    return "skip.svg";
  } else if (status === "completed") {
    return "check-circle-fill.svg";
  } else {
    return "circle.svg";
  }
}

export function getMenuBarShortcut(index: number) {
  const key = index + 1;

  let shortcut: Keyboard.Shortcut | undefined;
  if (key >= 1 && key <= 9) {
    shortcut = {
      modifiers: ["cmd"],
      key: String(key) as Keyboard.KeyEquivalent,
    };
  }

  return shortcut;
}

export const truncate = (text: string, maxLength: number): string => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + "...";
  }
  return text;
};

const shortWeekday = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short" });
const shortMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 60) {
    return `${Math.max(diffMin, 1)}m`;
  }
  if (diffHr < 24) {
    return `${diffHr}h`;
  }
  if (diffDays < 7) {
    return `${shortWeekday(date)} ${date.getDate()}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getDate()} ${shortMonth(date)}`;
  }
  return `${date.getDate()} ${shortMonth(date)} ${String(date.getFullYear()).slice(2)}`;
}
