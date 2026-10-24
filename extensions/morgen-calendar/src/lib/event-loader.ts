import type { Calendar, Event } from "../types";

export interface EventListResult {
  events: Event[];
  failures: { accountId: string; error: unknown }[];
}

export async function loadEventsByAccount(
  calendars: Calendar[],
  start: Date,
  end: Date,
  fetchEvents: (params: URLSearchParams) => Promise<Event[]>,
): Promise<EventListResult> {
  const groups = new Map<string, Calendar[]>();
  for (const calendar of calendars) {
    groups.set(calendar.accountId, [...(groups.get(calendar.accountId) ?? []), calendar]);
  }
  const accounts = [...groups];
  const responses = await Promise.allSettled(
    accounts.map(([accountId, accountCalendars]) =>
      fetchEvents(
        new URLSearchParams({
          accountId,
          calendarIds: accountCalendars.map((calendar) => calendar.id).join(","),
          start: start.toISOString(),
          end: end.toISOString(),
        }),
      ),
    ),
  );
  const result: EventListResult = { events: [], failures: [] };
  responses.forEach((response, index) => {
    if (response.status === "fulfilled") {
      const [accountId, accountCalendars] = accounts[index];
      result.events.push(
        ...response.value
          .filter(
            (event) =>
              accountCalendars.some((calendar) => calendar.id === event.calendarId) &&
              (!event.accountId || event.accountId === accountId),
          )
          .map((event) => ({ ...event, accountId })),
      );
    } else result.failures.push({ accountId: accounts[index][0], error: response.reason });
  });
  return result;
}
