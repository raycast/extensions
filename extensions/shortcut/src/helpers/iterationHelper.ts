import { Color } from "@raycast/api";
import { IterationSlim } from "@useshortcut/client";

export function getIterationProgressColor(iteration: IterationSlim): Color | string {
  switch (iteration.status) {
    case "unstarted":
      return Color.Orange;
    case "started":
      return Color.Green;
    default:
    case "done":
      return "#58b1e4";
  }
}
