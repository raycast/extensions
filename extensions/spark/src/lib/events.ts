import { CalendarEvent, toDate } from "./types";

export function dayLabel(date: Date | undefined): string {
  return date?.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) ?? "";
}

export function clock(date: Date | undefined): string {
  return date?.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) ?? "";
}

export function timeLabel(event: CalendarEvent): string {
  if (event.all_day) return "All day";
  return `${clock(toDate(event.start))} – ${clock(toDate(event.end))}`;
}

/// What a list row has room for: when the event starts ("10:00 am"), or
/// "All day".
export function startLabel(event: CalendarEvent): string {
  return event.all_day ? "All day" : clock(toDate(event.start));
}

/// The user still owes an answer (or answered maybe).
export function awaitsAnswer(event: CalendarEvent): boolean {
  return event.attending_status === "pending" || event.attending_status === "maybe";
}
