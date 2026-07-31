import { getCalendarClient, withGoogleAPIs } from "../lib/google";
import { getCalendarWithLabels, getEventLabels } from "../lib/calendar-resources";
import { serializeEvent } from "../lib/events";

type Input = {
  /**
   * Free-text terms matched against title, description, location, attendees, organizer, and
   * special-event/working-location fields. Use identifying keywords rather than guessed titles.
   */
  query?: string;
  /** RFC3339 lower bound for event end times. Defaults to now unless includePast is true. */
  timeMin?: string;
  /** RFC3339 exclusive upper bound for event start times. */
  timeMax?: string;
  /** Search before the current time when no timeMin is supplied. */
  includePast?: boolean;
  /** Maximum page size, from 1 to 2500. Defaults to 10. */
  maxResults?: number;
  /** Opaque token returned as nextPageToken by an earlier search-events call. */
  pageToken?: string;
  /** Calendar ID from list-calendars. Defaults to "primary". */
  calendarId?: string;
  /** Expand recurring series into individual instances. Defaults to true. */
  singleEvents?: boolean;
  /** Sort by startTime (requires singleEvents=true) or updated. Defaults to startTime. */
  orderBy?: "startTime" | "updated";
  /** Include cancelled/deleted events. */
  showDeleted?: boolean;
  /** Include hidden invitations. */
  showHiddenInvitations?: boolean;
  /** Comma-separated event types to return. Omit for all types. */
  eventTypes?: string;
  /** Find an event by RFC5545 iCalendar UID rather than Google event ID. */
  iCalUID?: string;
  /** Only return events updated at or after this RFC3339 timestamp. */
  updatedMin?: string;
  /** IANA time zone used to format returned event times. */
  timeZone?: string;
  /** Maximum attendees included per event. */
  maxAttendees?: number;
  /** Comma-separated private extended-property filters in propertyName=value form. */
  privateExtendedProperties?: string;
  /** Comma-separated shared extended-property filters in propertyName=value form. */
  sharedExtendedProperties?: string;
};

function parseList(value?: string) {
  return value
    ?.split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const tool = async (input: Input) => {
  const calendar = getCalendarClient();
  const calendarId = input.calendarId ?? "primary";
  const singleEvents = input.singleEvents ?? true;
  const orderBy = input.orderBy ?? (singleEvents ? "startTime" : undefined);
  if (orderBy === "startTime" && !singleEvents) {
    throw new Error('orderBy="startTime" requires singleEvents=true.');
  }
  const maxResults = input.maxResults ?? 10;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 2500) {
    throw new Error("maxResults must be a whole number from 1 to 2500.");
  }

  const [response, calendarMetadata] = await Promise.all([
    calendar.events.list({
      calendarId,
      q: input.query,
      timeMin: input.timeMin ?? (input.includePast ? undefined : new Date().toISOString()),
      timeMax: input.timeMax,
      maxResults,
      pageToken: input.pageToken,
      singleEvents,
      orderBy,
      showDeleted: input.showDeleted,
      showHiddenInvitations: input.showHiddenInvitations,
      eventTypes: parseList(input.eventTypes),
      iCalUID: input.iCalUID,
      updatedMin: input.updatedMin,
      timeZone: input.timeZone,
      maxAttendees: input.maxAttendees,
      privateExtendedProperty: parseList(input.privateExtendedProperties),
      sharedExtendedProperty: parseList(input.sharedExtendedProperties),
    }),
    getCalendarWithLabels(calendarId),
  ]);

  return {
    calendarId,
    calendarSummary: response.data.summary,
    timeZone: response.data.timeZone,
    nextPageToken: response.data.nextPageToken,
    nextSyncToken: response.data.nextSyncToken,
    events:
      response.data.items?.map((event) => serializeEvent(event, calendarId, getEventLabels(calendarMetadata))) ?? [],
  };
};

export default withGoogleAPIs(tool);
