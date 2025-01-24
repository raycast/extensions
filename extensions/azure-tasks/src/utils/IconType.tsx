import { Icon, Color } from "@raycast/api";

export function GetTaskIconType(taskStatus: string) {
  switch (taskStatus) {
    case "New":
      return Icon.Circle;
    case "Active":
      return Icon.CircleProgress50;
    case "Resolved":
      return Icon.CircleProgress100;
    case "Closed":
      return Icon.CircleProgress100;
    case "Done":
      return Icon.CircleProgress100;
    default:
      return Icon.Circle;
  }
}

export function GetIconColor(taskStatus: string) {
  switch (taskStatus) {
    case "New":
      return Color.Red;
    case "Active":
      return Color.Orange;
    case "Resolved":
      return Color.Green;
    case "Closed":
      return Icon.CircleProgress100;
    case "Done":
      return Color.Green;
    default:
      return Color.Magenta;
  }
}
