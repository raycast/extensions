import { serializeEvent } from "../lib/events";
import { getCalendarClient, withGoogleAPIs } from "../lib/google";

type Input = {
  /** Recurring series event ID from search-events or get-event. */
  eventId: string;
  /** Calendar containing the recurring series. Defaults to "primary". */
  calendarId?: string;
  /** RFC3339 exclusive lower bound for instance end times. */
  timeMin?: string;
  /** RFC3339 exclusive upper bound for instance start times. */
  timeMax?: string;
  /** Maximum instances in this page, 1-2500. Defaults to 50. */
  maxResults?: number;
  /** Opaque nextPageToken from an earlier call. */
  pageToken?: string;
  /** Include cancelled instances. */
  showDeleted?: boolean;
  /** IANA timezone used in returned instance times. */
  timeZone?: string;
  /** RFC3339 original start time of one specific instance. */
  originalStart?: string;
};

const tool = async (input: Input) => {
  const maxResults = input.maxResults ?? 50;
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 2500) {
    throw new Error("maxResults must be a whole number from 1 to 2500.");
  }

  const calendarId = input.calendarId ?? "primary";
  const response = await getCalendarClient().events.instances({
    calendarId,
    eventId: input.eventId,
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    maxResults,
    pageToken: input.pageToken,
    showDeleted: input.showDeleted,
    timeZone: input.timeZone,
    originalStart: input.originalStart,
  });

  return {
    calendarId,
    recurringEventId: input.eventId,
    nextPageToken: response.data.nextPageToken,
    instances: response.data.items?.map((event) => serializeEvent(event, calendarId)) ?? [],
  };
};

export default withGoogleAPIs(tool);
