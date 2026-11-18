import type { calendar_v3 } from "@googleapis/calendar";

const MAX_MENTIONS = 50;
const URI_PREFIX = "google-calendar://events/";
const DAY = 24 * 60 * 60 * 1000;

/** The few event fields mention search needs, small enough to cache. */
export type MentionEvent = {
  id: string;
  calendarId: string;
  calendarName?: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  recurringEventId?: string;
};

export function toMentionEvents(
  events: readonly calendar_v3.Schema$Event[],
  calendarId: string,
  calendarName?: string,
): MentionEvent[] {
  return events.flatMap((event) => {
    const start = event.start?.dateTime ?? event.start?.date;
    if (!event.id || !start || event.status === "cancelled") return [];
    const end = event.end?.dateTime ?? event.end?.date;
    return [
      {
        id: event.id,
        calendarId,
        ...(calendarName ? { calendarName } : {}),
        title: event.summary?.trim() || "Untitled Event",
        start,
        ...(end ? { end } : {}),
        allDay: Boolean(event.start?.date),
        ...(event.recurringEventId ? { recurringEventId: event.recurringEventId } : {}),
      },
    ];
  });
}

/** All-day dates are calendar days, so they are read as local midnight rather than UTC. */
function toTime(value: string, allDay: boolean) {
  return allDay ? new Date(`${value}T00:00:00`).getTime() : Date.parse(value);
}

/**
 * Puts ongoing and upcoming events first, soonest first, then past events, most recent first. An event shared across
 * several calendars appears once, and a recurring series contributes only its next and its most recent occurrence so
 * a weekly meeting does not fill the list.
 */
export function rankEventMentions(events: readonly MentionEvent[], now: Date) {
  const seenIds = new Set<string>();
  const unique = events.filter((event) => {
    if (seenIds.has(event.id)) return false;
    seenIds.add(event.id);
    return true;
  });

  const nowTime = now.getTime();
  const ends = (event: MentionEvent) => toTime(event.end ?? event.start, event.allDay);
  const starts = (event: MentionEvent) => toTime(event.start, event.allDay);
  const upcoming = unique.filter((event) => ends(event) > nowTime).sort((a, b) => starts(a) - starts(b));
  const past = unique.filter((event) => ends(event) <= nowTime).sort((a, b) => starts(b) - starts(a));

  const keepFirstOfSeries = (list: MentionEvent[]) => {
    const seenSeries = new Set<string>();
    return list.filter((event) => {
      if (!event.recurringEventId) return true;
      const key = `${event.calendarId}\n${event.recurringEventId}`;
      if (seenSeries.has(key)) return false;
      seenSeries.add(key);
      return true;
    });
  };

  return [...keepFirstOfSeries(upcoming), ...keepFirstOfSeries(past)];
}

export function formatEventTime(event: MentionEvent, options: { locale?: string; timeZone?: string } = {}) {
  if (event.allDay) {
    const date = new Intl.DateTimeFormat(options.locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${event.start}T00:00:00Z`));
    const days =
      event.end && event.end > event.start
        ? Math.round((Date.parse(`${event.end}T00:00:00Z`) - Date.parse(`${event.start}T00:00:00Z`)) / DAY)
        : 1;
    return days > 1 ? `${date}, ${days} days` : `${date}, all day`;
  }

  return new Intl.DateTimeFormat(options.locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: options.timeZone,
  }).format(new Date(event.start));
}

export function toEventMentionUri(calendarId: string, eventId: string) {
  return `${URI_PREFIX}${encodeURIComponent(calendarId)}/${encodeURIComponent(eventId)}`;
}

export function toEventMentions(
  events: readonly MentionEvent[],
  icon: string,
  options: { locale?: string; timeZone?: string } = {},
) {
  return events.slice(0, MAX_MENTIONS).map((event) => ({
    title: event.title,
    uri: toEventMentionUri(event.calendarId, event.id),
    description: [formatEventTime(event, options), event.calendarName].filter(Boolean).join(" · "),
    icon,
  }));
}

export function isEventMentionUri(uri: string) {
  return uri.startsWith(URI_PREFIX);
}

export function parseEventMentionUri(uri: string) {
  const invalid = new Error("Invalid Google Calendar event URI.");
  if (!isEventMentionUri(uri)) throw invalid;
  const parts = uri.slice(URI_PREFIX.length).split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw invalid;
  try {
    return { calendarId: decodeURIComponent(parts[0]), eventId: decodeURIComponent(parts[1]) };
  } catch {
    throw invalid;
  }
}

type GetEvent = (
  calendarId: string,
  eventId: string,
) => Promise<object & { id?: string | null; status?: string | null }>;

/** Reads the full, current event when the message is sent, so a moved or edited event is not stale. */
export async function readEventMention(uri: string, getEvent: GetEvent) {
  const { calendarId, eventId } = parseEventMentionUri(uri);
  let event: Awaited<ReturnType<GetEvent>>;
  try {
    event = await getEvent(calendarId, eventId);
  } catch (error) {
    const code = (error as { code?: unknown; status?: unknown }).code ?? (error as { status?: unknown }).status;
    if (code === 404 || code === 410 || code === "404" || code === "410") {
      throw new Error("This Google Calendar event is no longer available.");
    }
    throw error;
  }
  // Google still returns an event cancelled after it was mentioned, marked as cancelled.
  if (event.id !== eventId || event.status === "cancelled") {
    throw new Error("This Google Calendar event is no longer available.");
  }
  return { text: JSON.stringify(event, null, 2), mimeType: "application/json" };
}
