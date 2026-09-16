import { getDateWithOffset } from "./getDateWithOffset";

/**
 * Human-friendly date in a timezone, e.g. "Tue, 3 Sep". Used to make it
 * obvious when a buddy is on a different calendar day to you.
 */
export function getCurrentDateForTz(tz: string, offsetHrs?: number): string {
  const formatter = new Intl.DateTimeFormat(["en-GB"], {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const date = getDateWithOffset(offsetHrs);
  return formatter.format(date);
}
