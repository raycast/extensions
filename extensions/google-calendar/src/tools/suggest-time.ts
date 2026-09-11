import { getCalendarClient, withGoogleAPIs } from "../lib/google";
import { computeSuggestedSlots, validateSuggestionInput } from "../lib/suggest-time";
import { parseAttendeeEmails } from "../lib/utils";
import { tool as getCurrentUser } from "./get-current-user";

type Input = {
  /** Comma-separated attendee or calendar emails. The current user is always included. */
  attendees?: string;
  /** Inclusive RFC3339 start of the range to search. */
  timeMin: string;
  /** Exclusive RFC3339 end of the range to search. */
  timeMax: string;
  /** Required meeting length in minutes. */
  durationMinutes: number;
  /** IANA time zone used for work hours and displayed suggestions. Defaults to the user's local zone. */
  timeZone?: string;
  /** Local workday start as HH:mm. Defaults to 09:00. */
  workDayStart?: string;
  /** Local workday end as HH:mm. Defaults to 17:00. */
  workDayEnd?: string;
  /** Include Saturday and Sunday. Defaults to false. */
  includeWeekends?: boolean;
  /** Slot-start interval in minutes. Defaults to 15. */
  incrementMinutes?: number;
  /** Free buffer required before and after busy periods, in minutes. Defaults to 0. */
  bufferMinutes?: number;
  /** Maximum suggestions to return. Defaults to 10, maximum 50. */
  maxSuggestions?: number;
};

const tool = async (input: Input) => {
  const buffer = input.bufferMinutes ?? 0;
  if (!Number.isFinite(buffer) || buffer < 0) throw new Error("bufferMinutes cannot be negative.");

  const timeZone = input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const suggestionInput = { ...input, timeZone };
  validateSuggestionInput(suggestionInput);

  const { emails, invalidEntries } = parseAttendeeEmails(input.attendees);
  if (invalidEntries.length) throw new Error(`Invalid attendee email: ${invalidEntries.join(", ")}`);
  const currentUser = await getCurrentUser();
  if (!currentUser.email) throw new Error("Could not determine the current user's calendar email.");
  const participants = [...new Set([...emails, currentUser.email].map((email) => email.toLowerCase()))];

  const freeBusy = await getCalendarClient().freebusy.query({
    requestBody: {
      timeMin: input.timeMin,
      timeMax: input.timeMax,
      timeZone,
      items: participants.map((id) => ({ id })),
    },
  });
  const errors = Object.entries(freeBusy.data.calendars ?? {}).flatMap(([calendarId, result]) =>
    (result.errors ?? []).map((error) => ({ calendarId, reason: error.reason, domain: error.domain })),
  );
  if (errors.length > 0) {
    throw new Error(`Could not read availability for: ${errors.map((error) => error.calendarId).join(", ")}`);
  }

  const bufferMs = buffer * 60000;
  const busy = Object.values(freeBusy.data.calendars ?? {}).flatMap((calendar) =>
    (calendar.busy ?? []).flatMap((period) =>
      period.start && period.end
        ? [{ start: Date.parse(period.start) - bufferMs, end: Date.parse(period.end) + bufferMs }]
        : [],
    ),
  );
  const suggestions = computeSuggestedSlots(suggestionInput, busy);

  return {
    participants,
    durationMinutes: input.durationMinutes,
    searchedRange: { start: input.timeMin, end: input.timeMax, timeZone },
    workHours: { start: input.workDayStart ?? "09:00", end: input.workDayEnd ?? "17:00" },
    suggestions,
  };
};

export default withGoogleAPIs(tool);
