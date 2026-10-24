/**
 * Plane stores start and due dates as calendar dates (`YYYY-MM-DD`). The SDK sends a `Date` as
 * `toISOString().substring(0, 10)`, so a local-midnight date from `Form.DatePicker` lands on the
 * previous day for anyone east of UTC. These helpers keep the calendar day the user picked.
 */

/** Converts a date picked in the user's time zone to UTC midnight of the same calendar day. */
export function toPlaneDate(date: Date | null | undefined): Date | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/** Converts a Plane calendar date (string or UTC-midnight `Date`) to local midnight of the same day. */
export function fromPlaneDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
