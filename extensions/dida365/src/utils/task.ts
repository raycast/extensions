import { Color, Icon } from "@raycast/api";
import type { ChecklistItem, Task, TaskPriority } from "../types.js";

export function priorityLabel(priority?: TaskPriority): string {
  switch (priority) {
    case 5:
      return "High";
    case 3:
      return "Medium";
    case 1:
      return "Low";
    default:
      return "None";
  }
}

export function priorityAccessory(priority?: TaskPriority) {
  switch (priority) {
    case 5:
      return {
        tag: { value: "High", color: Color.Red },
        icon: Icon.ExclamationMark,
      };
    case 3:
      return { tag: { value: "Medium", color: Color.Orange } };
    case 1:
      return { tag: { value: "Low", color: Color.Blue } };
    default:
      return undefined;
  }
}

export function taskSearchText(task: Task): string {
  return [
    task.title,
    task.content,
    task.desc,
    task.dueDate,
    ...(task.items?.map((item) => item.title) ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

export function isChecklistItemCompleted(item: ChecklistItem): boolean {
  return item.status === 2;
}
