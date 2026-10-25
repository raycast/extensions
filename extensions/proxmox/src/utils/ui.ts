import type { Image } from "@raycast/api";
import { Color, Icon } from "@raycast/api";
import { PveVmStatus } from "@/types";

export function getVmStatusIcon(status: PveVmStatus): Image {
  switch (status) {
    case PveVmStatus.running:
      return {
        source: Icon.Play,
        tintColor: Color.Green,
      };
    case PveVmStatus.stopped:
      return {
        source: Icon.Stop,
        tintColor: Color.SecondaryText,
      };
    case PveVmStatus.paused:
      return {
        source: Icon.Pause,
        tintColor: Color.Yellow,
      };
    default:
      return {
        source: Icon.QuestionMark,
      };
  }
}

/** `status` is "OK", "WARNINGS: n" or an error message, and absent while the task runs */
export function getTaskStatusIcon(status?: string): Image {
  if (status === undefined) {
    return { source: Icon.CircleProgress50, tintColor: Color.Blue };
  }
  if (status === "OK") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (status.startsWith("WARNINGS")) {
    return { source: Icon.Warning, tintColor: Color.Orange };
  }
  return { source: Icon.XMarkCircle, tintColor: Color.Red };
}

export function getStorageStatusIcon(status: string): Image {
  switch (status) {
    case "available":
      return {
        source: Icon.Checkmark,
        tintColor: Color.Green,
      };
      break;
    default:
      return {
        source: Icon.QuestionMark,
        tintColor: Color.SecondaryText,
      };
      break;
  }
}
