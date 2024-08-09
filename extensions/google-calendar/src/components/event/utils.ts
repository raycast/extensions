import { CalendarEvent } from "@lib/api";

export function getEventReminders(event: CalendarEvent) {
  const e = event.event;
  if (!e.reminders) {
    return;
  }
  if (e.reminders.useDefault === true) {
    return; // FIXME get default from calendar
  }
  const minutes = e.reminders.overrides?.map((o) => o.minutes).filter((m) => m !== undefined) as number[] | undefined;
  return minutes;
}
