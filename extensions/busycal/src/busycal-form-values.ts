/**
 * Formats one Raycast form date value into the BusyCal automation formats that the app already accepts.
 *
 * All-day values use BusyCal's bare `YYYY-MM-DD` form. Timed values use the
 * user's local wall clock as `YYYY-MM-DDTHH:mm:ss` so BusyCal receives the same
 * time the Raycast form displayed. BusyCal rejects strings with a UTC offset.
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

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}T${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}:${`${date.getSeconds()}`.padStart(2, "0")}`;
}
