import { getRelativeOffsetMinutes } from "./getTzOffsetMinutes";

/**
 * Human-readable offset of a timezone relative to the local one, e.g.
 * "is 3 hours ahead", "is 1 hour behind", "is 5.5 hours ahead".
 */
export function getOffsetForTz(tz: string, offsetHrs?: number): string {
  const minutes = getRelativeOffsetMinutes(tz, offsetHrs);

  if (minutes === 0) {
    return "has the same time";
  }

  const totalHrs = Math.abs(minutes) / 60;
  // Drop the trailing ".0" for whole-hour offsets, keep it for 5.5, 5.75 etc.
  const hrs = Number.isInteger(totalHrs) ? totalHrs.toString() : totalHrs.toFixed(2).replace(/\.?0+$/, "");
  const unit = totalHrs === 1 ? "hour" : "hours";
  const direction = minutes > 0 ? "ahead" : "behind";

  return `is ${hrs} ${unit} ${direction}`;
}
