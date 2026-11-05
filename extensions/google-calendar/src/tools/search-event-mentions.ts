import { Icon } from "@raycast/api";
import { withCache } from "@raycast/utils";
import { SCHEDULE_EVENT_TYPES, isContactsBirthdaysCalendar } from "../lib/event-types";
import { rankEventMentions, toEventMentions, toMentionEvents } from "../lib/event-mentions";
import { getAccountKey, getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** What the user typed in the Events mention search, empty for the default list. */
  query: string;
};

const DAY = 24 * 60 * 60 * 1000;
const MAX_CALENDARS = 10;
// Working locations repeat every day and are rarely what someone wants to mention.
const MENTION_EVENT_TYPES = SCHEDULE_EVENT_TYPES.filter((type) => type !== "workingLocation");

/**
 * Calendars shown in Google Calendar, primary first, so search covers shared and team calendars too. The account key
 * only scopes the cache to the signed-in account.
 */
const getVisibleCalendars = withCache(
  async (accountKey: string) => {
    void accountKey;
    const response = await getCalendarClient().calendarList.list({ minAccessRole: "reader" });
    return (response.data.items ?? [])
      .filter((entry) => entry.id && entry.selected && !entry.hidden && !entry.deleted)
      .filter((entry) => !isContactsBirthdaysCalendar(entry.id))
      .sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)))
      .slice(0, MAX_CALENDARS)
      .map((entry) => ({ id: entry.id as string, name: entry.summaryOverride || entry.summary || undefined }));
  },
  { maxAge: 60 * 60 * 1000 },
);

const searchEvents = withCache(
  async (accountKey: string, query: string) => {
    const calendars = await getVisibleCalendars(accountKey);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Without a query, show today and the coming week. A query also finds recent past meetings.
    const timeMin = query ? new Date(now.getTime() - 90 * DAY) : startOfToday;
    const timeMax = query ? new Date(now.getTime() + 365 * DAY) : new Date(startOfToday.getTime() + 8 * DAY);

    const results = await Promise.allSettled(
      calendars.map(async (calendar) => {
        const response = await getCalendarClient().events.list({
          calendarId: calendar.id,
          q: query || undefined,
          singleEvents: true,
          orderBy: "startTime",
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          maxResults: 100,
          eventTypes: MENTION_EVENT_TYPES,
        });
        return toMentionEvents(response.data.items ?? [], calendar.id, calendar.name);
      }),
    );

    const fulfilled = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
    const failure = results.find((result) => result.status === "rejected");
    // A calendar that fails on its own should not hide the others, but no answer at all is an error.
    if (fulfilled.length === 0 && failure) throw failure.reason;
    return fulfilled.flat();
  },
  {
    maxAge: 5 * 60 * 1000,
    validate: (events) => events.length > 0,
  },
);

async function searchEventMentions(input: Input) {
  const events = await searchEvents(await getAccountKey(), input.query.trim());
  return toEventMentions(rankEventMentions(events, new Date()), Icon.Calendar);
}

export default withGoogleAPIs(searchEventMentions);
