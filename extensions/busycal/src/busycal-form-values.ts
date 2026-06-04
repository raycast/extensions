/**
 * Formats one Raycast form date value into the BusyCal automation formats that the app already accepts.
 *
 * All-day values use BusyCal's bare `YYYY-MM-DD` form. Timed values preserve
 * the user's local wall clock plus offset so BusyCal receives the same time the
 * Raycast form displayed.
 *
 * - Parameters:
 *   - date: The Raycast form date value.
 *   - allDay: Whether BusyCal should treat the value as an all-day date.
 * - Returns: A BusyCal-compatible date string.
 */
export function busyCalDateString(date: Date, allDay: boolean): string {
  if (allDay) {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
  }

  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const sign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const absoluteOffsetMinutes = Math.abs(timezoneOffsetMinutes);
  const offsetHours = `${Math.floor(absoluteOffsetMinutes / 60)}`.padStart(
    2,
    "0",
  );
  const offsetMinutes = `${absoluteOffsetMinutes % 60}`.padStart(2, "0");

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}T${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}:${`${date.getSeconds()}`.padStart(2, "0")}${sign}${offsetHours}:${offsetMinutes}`;
}
