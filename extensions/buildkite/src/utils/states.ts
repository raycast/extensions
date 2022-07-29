import { Color, Icon, Image } from "@raycast/api";

export type State =
  | "SKIPPED"
  | "CREATING"
  | "SCHEDULED"
  | "RUNNING"
  | "PASSED"
  | "FAILED"
  | "CANCELING"
  | "CANCELED"
  | "BLOCKED"
  | "NOT_RUN";

export function getStateIcon(state: State): Image.ImageLike | undefined {
  switch (state) {
    case "SCHEDULED":
      return Icon.Circle;

    case "CREATING":
    case "RUNNING":
      return { tintColor: Color.Yellow, source: Icon.Circle };

    case "PASSED":
    case "BLOCKED":
      return { tintColor: Color.Green, source: Icon.Checkmark };

    case "CANCELED":
    case "CANCELING":
    case "FAILED":
      return { tintColor: Color.Red, source: Icon.XMarkCircle };
  }
}
