/**
 * Google Business offers/full-day events only support a calendar date, not a time of day.
 * The date is read from `Date`'s local calendar fields (not `toISOString()`) because
 * `Form.DatePicker` values represent the user's selection in their local timezone; converting
 * via UTC can shift the calendar date by a day for users outside UTC.
 */
export function toDateOnlyIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

export const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Combines a calendar date with a separately-provided "HH:mm" time into a single ISO timestamp,
// used for Google Business Events when the user opts in to specifying a start/end time. Both the
// date and the time are interpreted in the user's local timezone (matching how they were entered),
// then converted to the equivalent UTC instant.
export function combineDateAndTime(date: Date, timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
  ).toISOString();
}
