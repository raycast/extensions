import { withGoogleAPIs, getCalendarClient } from "../google";

type Input = {
  /**
   * Free text search terms to find events
   *
   * @example "team meeting" or "lunch with John"
   *
   * @remarks
   * Searches across these calendar event fields:
   * - summary/title
   * - description
   * - location
   * - attendee's displayName and email
   * - organizer's displayName and email
   */
  query?: string;

  /**
   * The start date to search from
   *
   * @example "2024-03-20T00:00:00Z" or "2024-03-20"
   *
   * @remarks
   * Accepts ISO 8601 format dates. If not provided, defaults to current time.
   * Can be a date (YYYY-MM-DD) or datetime (YYYY-MM-DDTHH:mm:ssZ).
   */
  timeMin?: string;

  /**
   * The end date to search until
   *
   * @example "2024-03-27T23:59:59Z" or "2024-03-27"
   *
   * @remarks
   * Accepts ISO 8601 format dates.
   * Can be a date (YYYY-MM-DD) or datetime (YYYY-MM-DDTHH:mm:ssZ).
   */
  timeMax?: string;

  /**
   * Maximum number of events to return
   *
   * @default 10
   * @minimum 1
   * @maximum 2500
   *
   * @remarks
   * The Google Calendar API has a maximum limit of 2500 events per request.
   */
  maxResults?: number;
};

const tool = async (input: Input) => {
  const calendar = getCalendarClient();

  const requestParams = {
    calendarId: "primary",
    q: input.query,
    timeMin: input.timeMin || new Date().toISOString(),
    timeMax: input.timeMax,
    maxResults: input.maxResults || 10,
    singleEvents: true,
    orderBy: "startTime" as const,
  };

  const response = await calendar.events.list(requestParams);

  return (
    response.data.items?.map((event) => ({
      id: event.id || "",
      title: event.summary || "Untitled Event",
      start: event.start?.dateTime || event.start?.date || "No start date",
      end: event.end?.dateTime || event.end?.date || "No end date",
      attendees: event.attendees?.map((a) => a.email) || [],
      description: event.description,
      link: event.htmlLink,
    })) || []
  );
};

export default withGoogleAPIs(tool);
