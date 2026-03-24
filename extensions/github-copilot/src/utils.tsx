import { Color, Icon, Image, Keyboard } from "@raycast/api";
import { TaskWithPullRequest } from "./services/copilot";
import type { LogEntry } from "./services/events";

export function getLogEntryIcon(entry: LogEntry): { source: Icon; tintColor?: Color } {
  switch (entry.type) {
    case "tool_call":
      return { source: Icon.Terminal, tintColor: Color.Blue };
    case "user_message":
      return { source: Icon.Person, tintColor: Color.Green };
    case "assistant_message":
      return { source: Icon.Message, tintColor: Color.Purple };
    case "info":
      return { source: Icon.Info, tintColor: Color.SecondaryText };
    case "error":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    default:
      return { source: Icon.Circle };
  }
}

export function getTaskIcon(taskWithPullRequest: TaskWithPullRequest): Image.ImageLike {
  const source = getTaskIconPath(taskWithPullRequest);

  return { source, tintColor: Color.PrimaryText };
}

export function getTaskIconPath(taskWithPullRequest: TaskWithPullRequest): string {
  const state = taskWithPullRequest.task.state;

  if (state === "queued") {
    return "clock.svg";
  } else if (state === "in_progress") {
    return "sync.svg";
  } else if (state === "failed") {
    return "stop.svg";
  } else if (state === "timed_out") {
    return "stop.svg";
  } else if (state === "cancelled") {
    return "skip.svg";
  } else if (state === "completed") {
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
