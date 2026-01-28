import { Color, Icon, Image } from "@raycast/api";
import { BuildStates } from "../generated/graphql";

export function getStateIcon(state: BuildStates | undefined): Image.ImageLike | undefined {
  switch (state) {
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

    case "SCHEDULED":
    default:
      return Icon.Circle;
  }
}
