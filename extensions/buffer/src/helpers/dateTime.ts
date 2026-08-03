/** Google Business offers/full-day events only support a calendar date, not a time of day. */
export function toDateOnlyIso(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

export const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Combines a calendar date with a separately-provided "HH:mm" time into a single ISO timestamp,
// used for Google Business Events when the user opts in to specifying a start/end time.
export function combineDateAndTime(date: Date, timeStr: string): string {
  const datePart = date.toISOString().slice(0, 10);
  return new Date(`${datePart}T${timeStr}:00.000Z`).toISOString();
}
