import { withOccurrenceSeconds } from "./busycal-date";
import { BusyCalItem } from "./types";

/**
 * Converts one serialized BusyCal automation record into the extension's item model.
 *
 * - Parameters:
 *   - record: The decoded AppleScript record dictionary.
 *   - fallbackType: Optional item type to use when the record omitted one.
 * - Returns: A normalized BusyCal item ready for list rendering and reveal actions.
 */
export function busyCalItemFromRecord(
  record: Record<string, string>,
  fallbackType?: BusyCalItem["type"],
): BusyCalItem {
  const type = (record.type as BusyCalItem["type"]) ?? fallbackType ?? "event";

  return withOccurrenceSeconds({
    id: record.id ?? "",
    title: record.title ?? "",
    type,
    calendarID: record.calendarID ?? "",
    primaryDate: normalizedPrimaryDate(record, type),
    startDate: emptyToUndefined(record.startDate),
    endDate: emptyToUndefined(record.endDate),
    dueDate: emptyToUndefined(record.dueDate),
    location: emptyToUndefined(record.location),
    seriesUID: record.seriesUID ?? "",
    occurrenceDate: emptyToUndefined(record.occurrenceDate),
    isFloating: record.isFloating === "true",
  });
}

/**
 * Chooses the one date field the extension should treat as primary display and sort time.
 *
 * Tasks intentionally prefer due date so Raycast mirrors BusyCal's task UI
 * instead of surfacing internal start dates that may exist on task records.
 */
function normalizedPrimaryDate(
  record: Record<string, string>,
  type: BusyCalItem["type"],
): string | undefined {
  switch (type) {
    case "task":
      return (
        emptyToUndefined(record.dueDate) ??
        emptyToUndefined(record.occurrenceDate) ??
        emptyToUndefined(record.startDate)
      );
    case "event":
      return (
        emptyToUndefined(record.startDate) ??
        emptyToUndefined(record.occurrenceDate) ??
        emptyToUndefined(record.dueDate)
      );
    default:
      return (
        emptyToUndefined(record.occurrenceDate) ??
        emptyToUndefined(record.startDate) ??
        emptyToUndefined(record.dueDate)
      );
  }
}

/**
 * Converts empty serialized fields into `undefined`.
 */
function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}
