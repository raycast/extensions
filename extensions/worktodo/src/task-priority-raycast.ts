import { Icon } from "@raycast/api";
import type { TaskView } from "./shared/application/task-views";

export const PRIORITY_TINT = "#6A9A1D";
export const MENU_ICON_TINT = "#808080";

export function menuBarTaskIcon() {
  return { source: Icon.Circle, tintColor: MENU_ICON_TINT };
}

export function taskListIcon(view: TaskView, isCompletionAcknowledged: boolean) {
  if (isCompletionAcknowledged || view.kind === "completed") {
    return Icon.CheckCircle;
  }
  if (view.kind === "trash") {
    return Icon.Trash;
  }
  return Icon.Circle;
}
