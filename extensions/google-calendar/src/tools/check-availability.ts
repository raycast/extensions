import { withGoogleAPIs, getCalendarClient } from "../lib/google";
import { tool as getCurrentUser } from "./get-current-user";

type Input = {
  /**
   * List of email addresses to check availability for
   *
   * @remarks
   * Email addresses of the attendees whose availability you want to check.
   * These must be valid Google Calendar users in the format "user@domain.com".
   *
   * @example
   * ["john.doe@company.com", "jane.smith@company.com"]
   */
  attendees: string[];

  /**
   * The start of the time range to check for availability
   *
   * @remarks
   * Must be a valid ISO 8601 datetime string with timezone offset.
   * The format should be: YYYY-MM-DDTHH:mm:ss±HH:MM
   * For accurate timezone handling, always include the timezone offset (e.g., -07:00, +02:00) rather than using Z (UTC).
   *
   * @example
   * "2024-03-20T09:00:00-07:00" or "2024-03-20T09:00:00+02:00"
   */
  timeMin: string;

  /**
   * The end of the time range to check for availability
   *
   * @remarks
   * Must be a valid ISO 8601 datetime string with timezone offset.
   * The format should be: YYYY-MM-DDTHH:mm:ss±HH:MM
   * Must be later than timeMin.
   * For accurate timezone handling, always include the timezone offset (e.g., -07:00, +02:00) rather than using Z (UTC).
   *
   * @example
   * "2024-03-20T17:00:00-07:00" or "2024-03-20T17:00:00+02:00"
   */
  timeMax: string;
};

/**
 * Automatically includes the current user in the list of attendees.
 */
const tool = async (input: Input) => {
  const currentUser = await getCurrentUser();

  const calendar = getCalendarClient();

  const requestBody = {
    timeMin: input.timeMin,
    timeMax: input.timeMax,
    items: [...input.attendees.map((email) => ({ id: email })), { id: currentUser.email }],
  };

  const response = await calendar.freebusy.query({
    requestBody,
  });

  const calendars = response.data.calendars || {};

  return Object.entries(calendars).map(([email, availability]) => {
    return {
      email,
      busyPeriods: availability?.busy,
      errors: availability?.errors,
    };
  });
};

export default withGoogleAPIs(tool);
