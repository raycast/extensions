import { formatDueDateForApi } from "../../api/tasks";

/**
 * Parse an ISO 8601 date/datetime into TickTick's API format.
 * Date-only values (YYYY-MM-DD) are treated as all-day.
 */
export function parseDueDate(iso: string): { dueDate: string; isAllDay: boolean } {
  const trimmed = iso.trim();
  const isAllDay = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date "${iso}". Use ISO 8601 (e.g. 2026-08-06 or 2026-08-06T15:00:00).`);
  }
  return { dueDate: formatDueDateForApi(date, isAllDay), isAllDay };
}
