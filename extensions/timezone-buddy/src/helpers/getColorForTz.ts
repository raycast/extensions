import { getHourStatus } from "./getHourStatus";

export function getColorForTz(tz: string, offsetHrs?: number) {
  return getHourStatus(tz, offsetHrs).color;
}
