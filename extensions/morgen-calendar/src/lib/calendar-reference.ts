import { createHash } from "node:crypto";
import type { Calendar } from "../types";
import { calendarKey } from "./calendar-key";

export function calendarReference(calendar: Calendar): string {
  return createHash("sha256").update(calendarKey(calendar)).digest("hex");
}

export function resolveCalendar(reference: string, calendars: Calendar[]): Calendar {
  const matches = calendars.filter((calendar) => calendarReference(calendar) === reference);
  if (matches.length !== 1) throw new Error("Choose a unique calendar reference returned by List Calendars.");
  return matches[0];
}
