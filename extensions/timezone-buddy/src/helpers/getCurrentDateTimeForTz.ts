import { getDateWithOffset } from "./getDateWithOffset";

export function getCurrentDateTimeForTz(tz: string, offsetHrs?: number): string {
  const formatter = new Intl.DateTimeFormat(["en"], {
    timeZone: tz,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  const date = getDateWithOffset(offsetHrs);
  return formatter.format(date);
}
