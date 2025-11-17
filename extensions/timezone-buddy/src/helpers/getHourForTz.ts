import { getDateWithOffset } from "./getDateWithOffset";

export function getHourForTz(tz: string, offsetHrs?: number): number {
  const formatter = new Intl.DateTimeFormat(["en-GB"], {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });

  const date = getDateWithOffset(offsetHrs);
  return Number(formatter.format(date));
}
