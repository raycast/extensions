import { getHourStatus } from "./getHourStatus";

export function getTooltipForTz(tz: string, offsetHrs?: number) {
  return getHourStatus(tz, offsetHrs).tooltip;
}
