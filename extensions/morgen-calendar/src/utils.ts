import { showToast, Toast } from "@raycast/api";
import { listCalendars, readEvents } from "./lib/morgen";
import type { Calendar, Event } from "./types";

export type EventWithCalendar = Event & { calendarName: string };

export { eventDate, formatTime, formatDateTime, computeDuration } from "./lib/event-time";
import { eventDate } from "./lib/event-time";

export function getConferenceUrl(event: Event): string | undefined {
  return event["morgen.so:derived"]?.virtualRoom?.url ?? event["google.com:hangoutLink"];
}

export function getLocation(event: Event): string | undefined {
  if (!event.locations) return undefined;
  const first = Object.values(event.locations)[0];
  return first?.name || undefined;
}

export async function fetchEventsForRange(start: string, end: string): Promise<EventWithCalendar[]> {
  const calendars = (await listCalendars()).filter((calendar) => calendar.myRights?.mayReadItems !== false);
  if (calendars.length === 0) return [];

  const calendarMap = new Map<string, Calendar>();
  for (const cal of calendars) {
    calendarMap.set(JSON.stringify([cal.accountId, cal.id]), cal);
  }

  const grouped = new Map<string, Calendar[]>();
  for (const cal of calendars) {
    const existing = grouped.get(cal.accountId) ?? [];
    existing.push(cal);
    grouped.set(cal.accountId, existing);
  }

  const allEvents: EventWithCalendar[] = [];
  for (const [accountId, cals] of grouped) {
    const calendarIds = cals.map((c) => c.id);
    const evts = await readEvents(accountId, calendarIds, start, end);
    for (const evt of evts) {
      if (
        !calendarIds.includes(evt.calendarId) ||
        (evt.accountId && evt.accountId !== accountId) ||
        evt["morgen.so:metadata"]?.taskId
      )
        continue;
      const cal = calendarMap.get(JSON.stringify([accountId, evt.calendarId]));
      allEvents.push({ ...evt, calendarName: cal?.name ?? "Unknown" });
    }
  }

  allEvents.sort(
    (a, b) =>
      eventDate(a.start, a.showWithoutTime ? undefined : a.timeZone).getTime() -
      eventDate(b.start, b.showWithoutTime ? undefined : b.timeZone).getTime(),
  );
  return allEvents;
}

export async function fetchEventsWithErrorHandling(
  start: string,
  end: string,
  isCurrent: () => boolean = () => true,
): Promise<{ events: EventWithCalendar[]; error: boolean }> {
  try {
    const events = await fetchEventsForRange(start, end);
    return { events, error: false };
  } catch (error) {
    if (isCurrent())
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load events",
        message: String(error),
      });
    return { events: [], error: true };
  }
}
