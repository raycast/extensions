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

export const sortIterationByStartDateDesc = (a: IterationSlim, b: IterationSlim) => {
  return Date.parse(b.start_date) - Date.parse(a.start_date);
};
