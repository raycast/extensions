import { listCalendars, listEvents } from "../api";

type Input = {
  /** Inclusive ISO 8601 start timestamp with Z or an explicit UTC offset. */
  start: string;
  /** Exclusive ISO 8601 end timestamp with Z or an explicit UTC offset. Maximum range: 62 days. */
  end: string;
  /** Optional case-insensitive title substring. Omit when checking availability. */
  query?: string;
};

export default async function tool(input: Input) {
  const timestamps = [input.start, input.end].map((value) => {
    if (
      !/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))
    ) {
      throw new Error(
        "Start and end must be ISO timestamps with an explicit timezone offset.",
      );
    }
    return Date.parse(value);
  });
  const span = timestamps[1] - timestamps[0];
  if (span <= 0 || span > 62 * 86400000)
    throw new Error("Choose a positive time range of at most 62 days.");

  const calendars = await listCalendars();
  const accounts = [
    ...new Set(calendars.map((calendar) => calendar.accountId)),
  ];
  const events = [];
  for (const accountId of accounts) {
    const selected = calendars.filter(
      (calendar) => calendar.accountId === accountId,
    );
    const result = await listEvents(
      accountId,
      selected.map((calendar) => calendar.id),
      input.start,
      input.end,
    );
    for (const event of result) {
      if (
        input.query &&
        !event.title?.toLowerCase().includes(input.query.toLowerCase())
      )
        continue;
      events.push({
        id: event.id,
        accountId,
        calendarId: event.calendarId,
        calendarName: selected.find(
          (calendar) => calendar.id === event.calendarId,
        )?.name,
        title: event.title,
        start: event.start,
        timeZone: event.timeZone,
        duration: event.duration,
        end: event.end,
        showWithoutTime: event.showWithoutTime,
        freeBusyStatus: event.freeBusyStatus,
      });
    }
  }
  return { start: input.start, end: input.end, events };
}
