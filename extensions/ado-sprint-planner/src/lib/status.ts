import { Color, Icon } from "@raycast/api";
import { LocalStatus } from "./types";

export function statusLabel(s: LocalStatus): string {
  switch (s) {
    case "not-started":
      return "Not Started";
    case "in-progress":
      return "In Progress";
    case "done":
      return "Done";
  }
}

export function statusColor(s: LocalStatus): Color {
  switch (s) {
    case "not-started":
      return Color.SecondaryText;
    case "in-progress":
      return Color.Blue;
    case "done":
      return Color.Green;
  }
}

export function statusIcon(s: LocalStatus): Icon {
  switch (s) {
    case "not-started":
      return Icon.Circle;
    case "in-progress":
      return Icon.CircleProgress50;
    case "done":
      return Icon.CheckCircle;
  }
}
