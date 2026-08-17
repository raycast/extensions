import { getDateWithOffset } from "./getDateWithOffset";

/**
 * Short zone abbreviation for a timezone, e.g. "EDT", "GMT+10", "AEST".
 * Falls back to the raw timezone if the runtime can't produce a short name.
 */
export function getZoneAbbreviation(tz: string, offsetHrs?: number): string {
  const formatter = new Intl.DateTimeFormat(["en-US"], {
    timeZone: tz,
    timeZoneName: "short",
  });

  const date = getDateWithOffset(offsetHrs);
  const part = formatter.formatToParts(date).find((p) => p.type === "timeZoneName");
  return part?.value ?? tz;
}
