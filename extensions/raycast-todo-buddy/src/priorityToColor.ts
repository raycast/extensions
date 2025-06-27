import { Color } from "@raycast/api";
import { Priority } from "./date";

export function priorityToColor(priority: Priority) {
  switch (priority) {
    case Priority.High:
      return Color.Red;
    case Priority.Medium:
      return Color.Orange;
    case Priority.Low:
      return Color.Yellow;
    case Priority.Default:
    default:
      return Color.SecondaryText;
  }
}
