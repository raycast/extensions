import { Color, Icon, Image } from "@raycast/api";
import type { BuildStates, JobStates } from "../generated/graphql";

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

export function getJobStateIcon(state: JobStates | undefined): Image.ImageLike {
  switch (state) {
    case "FINISHED":
    case "UNBLOCKED":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "BROKEN":
    case "TIMED_OUT":
    case "TIMING_OUT":
    case "EXPIRED":
    case "UNBLOCKED_FAILED":
    case "WAITING_FAILED":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "BLOCKED":
    case "BLOCKED_FAILED":
      return { source: Icon.Lock, tintColor: Color.Orange };
    case "RUNNING":
    case "ACCEPTED":
    case "ASSIGNED":
      return { source: Icon.CircleProgress50, tintColor: Color.Yellow };
    case "CANCELED":
    case "CANCELING":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    case "SKIPPED":
      return { source: Icon.Forward, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}
