import { Icon, Color } from "@raycast/api";
import { JobStatus } from "../types";

export function getStatusIcon(status: JobStatus): {
  source: Icon;
  tintColor: Color;
} {
  switch (status) {
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failure":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "running":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "aborted":
      return { source: Icon.MinusCircle, tintColor: Color.Orange };
    case "disabled":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function normalizeJobStatus(color: string): JobStatus {
  const isAnimated = color.endsWith("_anime");
  if (isAnimated) return "running";
  const base = color.replace(/_anime$/, "");
  switch (base) {
    case "blue":
      return "success";
    case "red":
      return "failure";
    case "aborted":
      return "aborted";
    case "disabled":
    case "notbuilt":
    case "grey":
      return "disabled";
    default:
      return "disabled";
  }
}
