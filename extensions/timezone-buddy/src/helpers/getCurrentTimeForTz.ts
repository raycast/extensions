import { getDateWithOffset } from "./getDateWithOffset";

export function getCurrentTimeForTz(tz: string, offsetHrs?: number): string {
  const formatter = new Intl.DateTimeFormat([], {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
  });

  const date = getDateWithOffset(offsetHrs);
  return formatter.format(date);
}
