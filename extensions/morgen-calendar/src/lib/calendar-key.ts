import type { Calendar } from "../types";

export function calendarKey(calendar: Pick<Calendar, "accountId" | "id">): string {
  return JSON.stringify([calendar.accountId, calendar.id]);
}
