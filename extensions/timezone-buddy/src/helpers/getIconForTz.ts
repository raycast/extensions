import { getHourStatus } from "./getHourStatus";

export function getIconForTz(tz: string, offsetHrs?: number) {
  return getHourStatus(tz, offsetHrs).icon;
}
