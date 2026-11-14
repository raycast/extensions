import { getCalendarWithLabels, getEventLabels } from "./lib/calendar-resources";
import { readContactMention } from "./lib/contact-mentions";
import { isEventMentionUri, readEventMention } from "./lib/event-mentions";
import { serializeEvent } from "./lib/events";
import { getCalendarClient, searchContacts, withGoogleAPIs } from "./lib/google";

type Input = {
  /** The URI of a person or event selected from the Contacts or Events mention search. */
  uri: string;
};

async function getEvent(calendarId: string, eventId: string) {
  const [response, calendar] = await Promise.all([
    getCalendarClient().events.get({ calendarId, eventId }),
    getCalendarWithLabels(calendarId).catch(() => undefined),
  ]);
  return {
    ...serializeEvent(response.data, calendarId, calendar ? getEventLabels(calendar) : undefined),
    calendarName: calendar?.summary ?? undefined,
  };
}

async function readResource({ uri }: Input) {
  if (isEventMentionUri(uri)) return readEventMention(uri, getEvent);
  return readContactMention(uri, searchContacts);
}

export default withGoogleAPIs(readResource);
