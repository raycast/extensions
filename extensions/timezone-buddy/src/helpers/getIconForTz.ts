import { Icon } from "@raycast/api";
import { getHourForTz } from "./getHourForTz";

export function getIconForTz(tz: string, offsetHrs?: number) {
  const hour = getHourForTz(tz, offsetHrs);
  if ((hour >= 8 && hour < 9) || (hour >= 19 && hour < 23)) {
    return Icon.Warning;
  }

  if (hour >= 23 || hour <= 7) {
    return Icon.Moon;
  }

  return Icon.Emoji;
}
