import { withGoogleAPIs, getCalendarClient } from "../lib/google";

type Input = {
  /**
   * Free text search terms to find events
   *
   * @example When user asks "find my 1:1 with Beth", use query "beth" to find meetings where Beth is an attendee
   * @example When user asks "show my team meetings", use query "team" to find relevant meetings
   *
   * @remarks
   * - Focus on key identifying terms rather than guessing exact meeting titles
   * - For 1:1s or meetings with specific people, search for the person's name only
   * - For topic-based searches, use key topic words (e.g. "standup", "planning", "review")
   *
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
   * @example "2024-03-20T00:00:00-07:00" or "2024-03-20T00:00:00+02:00"
   *
   * @remarks
   * Accepts ISO 8601 format dates with timezone offset for accurate timezone handling.
   * If not provided, defaults to current time.
   * Can be a date (YYYY-MM-DD) or datetime with timezone offset (YYYY-MM-DDTHH:mm:ss±HH:MM).
   * For accurate timezone handling, always include the timezone offset (e.g., -07:00, +02:00) rather than using Z (UTC).
   */
  timeMin?: string;

  /**
   * The end date to search until
   *
   * @example "2024-03-27T23:59:59-07:00" or "2024-03-27T23:59:59+02:00"
   *
   * @remarks
   * Accepts ISO 8601 format dates with timezone offset for accurate timezone handling.
   * Can be a date (YYYY-MM-DD) or datetime with timezone offset (YYYY-MM-DDTHH:mm:ss±HH:MM).
   * For accurate timezone handling, always include the timezone offset (e.g., -07:00, +02:00) rather than using Z (UTC).
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

  /**
   * The ID of the calendar to search
   *
   * @example "primary" or "email@abstract...com"
   * @default "primary"
   *
   * @remarks
   * If not provided, searches the user's primary calendar. If used, get this from `list-calendars` tool.
   */
  calendarId?: string;
};

const tool = async (input: Input) => {
  const calendar = getCalendarClient();

  const requestParams = {
    calendarId: input.calendarId || "primary",
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
