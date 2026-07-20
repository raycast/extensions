import { Color } from "@raycast/api";
import { getHourForTz } from "./getHourForTz";

export function getColorForTz(tz: string, offsetHrs?: number) {
  const hour = getHourForTz(tz, offsetHrs);

  if ((hour >= 8 && hour < 9) || (hour >= 19 && hour < 23)) {
    return Color.Yellow;
  }

  if (hour >= 23 || hour <= 7) {
    return Color.Red;
  }

  return Color.Green;
}
