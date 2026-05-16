import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Create a new calendar event or update an existing one.
 * Times are ISO 8601 (e.g. "2026-05-20T15:00:00-07:00"). Requires confirmation when attendees are set.
 */
type Input = {
  /**
   * Existing event id to update. Omit to create a new event.
   */
  eventId?: string;
  /**
   * Event title/summary.
   */
  title?: string;
  /**
   * Start time in ISO 8601 format.
   */
  start?: string;
  /**
   * End time in ISO 8601 format.
   */
  end?: string;
  /**
   * Location string (free text or a URL like a Zoom link).
   */
  location?: string;
  /**
   * Description / agenda for the event.
   */
  description?: string;
  /**
   * Attendee email addresses to invite.
   */
  attendees?: string[];
  /**
   * Whether this is an all-day event.
   */
  allDay?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.attendees || input.attendees.length === 0) return undefined;
  const info: { name: string; value: string }[] = [];
  if (input.title) info.push({ name: "Title", value: input.title });
  if (input.start) info.push({ name: "Start", value: input.start });
  if (input.end) info.push({ name: "End", value: input.end });
  if (input.location) info.push({ name: "Location", value: input.location });
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
  const args: Record<string, unknown> = {};
  if (input.eventId) args.event_id = input.eventId;
  if (input.title !== undefined) args.title = input.title;
  if (input.start !== undefined) args.start = input.start;
  if (input.end !== undefined) args.end = input.end;
  if (input.location !== undefined) args.location = input.location;
  if (input.description !== undefined) args.description = input.description;
  if (input.attendees?.length) args.attendees = input.attendees;
  if (input.allDay !== undefined) args.all_day = input.allDay;
  return callMcpTool("create_or_update_event", args);
}
