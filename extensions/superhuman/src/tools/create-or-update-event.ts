import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { CreateOrUpdateEventInput, validate } from "../lib/validation";

/**
 * Create or update a calendar event.
 *
 * `timezone` (IANA) is required. Times are RFC3339. `recurrence` is an
 * iCalendar RRULE string. `reminders` accepts an array of
 * `{ method: "email" | "popup", minutes }`. Setting `conference: true`
 * adds a video link via the user's connected provider.
 */
type Input = {
  /** Existing event id to update. Omit to create. */
  eventId?: string;
  /** Calendar id to target. Defaults to the user's primary calendar. */
  calendarId?: string;
  /** Event title / summary. */
  title?: string;
  /** Start time (RFC3339). */
  start?: string;
  /** End time (RFC3339). */
  end?: string;
  /** IANA timezone (e.g. "America/Los_Angeles"). Required. */
  timezone: string;
  /** Attendee email addresses to invite. */
  attendees?: string[];
  /** Add a video conference link to the event. */
  conference?: boolean;
  /** Event description as HTML. */
  description?: string;
  /** Location string (free text or URL). */
  location?: string;
  /** All-day event. */
  isAllDay?: boolean;
  /** Deprecated: alias for `isAllDay`. */
  allDay?: boolean;
  /** iCalendar RRULE string for recurring events. */
  recurrence?: string;
  /** Per-event reminders. */
  reminders?: { method: "email" | "popup"; minutes: number }[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = readOnlyConfirmation("create-or-update-event");
  if (blocked) return blocked;
  if (!input.attendees || input.attendees.length === 0) return undefined;
  const info: { name: string; value: string }[] = [];
  if (input.title) info.push({ name: "Title", value: input.title });
  if (input.start) info.push({ name: "Start", value: input.start });
  if (input.end) info.push({ name: "End", value: input.end });
  if (input.timezone) info.push({ name: "Timezone", value: input.timezone });
  if (input.location) info.push({ name: "Location", value: input.location });
  if (input.conference) info.push({ name: "Conference", value: "Video link added" });
  if (input.recurrence) info.push({ name: "Recurrence", value: input.recurrence });
  info.push({ name: "Attendees", value: input.attendees.join(", ") });
  return {
    message: input.eventId
      ? "Update calendar event and notify attendees?"
      : "Create calendar event and invite attendees?",
    image: "📅",
    info,
  };
};

export default async function tool(input: Input): Promise<unknown> {
  assertWritable("create-or-update-event");
  const parsed = validate(CreateOrUpdateEventInput, input);
  const args: Record<string, unknown> = { timezone: parsed.timezone };
  if (parsed.eventId) args.event_id = parsed.eventId;
  if (parsed.calendarId) args.calendar_id = parsed.calendarId;
  if (parsed.title !== undefined) args.title = parsed.title;
  if (parsed.start !== undefined) args.start = parsed.start;
  if (parsed.end !== undefined) args.end = parsed.end;
  if (parsed.location !== undefined) args.location = parsed.location;
  if (parsed.description !== undefined) args.description = parsed.description;
  if (parsed.attendees?.length) args.attendees = parsed.attendees;
  if (parsed.conference !== undefined) args.conference = parsed.conference;
  const isAllDay = parsed.isAllDay ?? parsed.allDay;
  if (isAllDay !== undefined) args.is_all_day = isAllDay;
  if (parsed.recurrence) args.recurrence = parsed.recurrence;
  if (parsed.reminders?.length) args.reminders = parsed.reminders;
  return callMcpTool("create_or_update_event", args);
}
