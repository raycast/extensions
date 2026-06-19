import { calAPI } from "@api/cal.com";

type Input = {
  /** Event type id to check availability for. */
  eventTypeId: number;
  /** ISO 8601 start of the search window. */
  start: string;
  /** ISO 8601 end of the search window. */
  end: string;
  /** Slot length in minutes (defaults to event type duration). */
  duration?: number;
  /** IANA timezone to format slots in (e.g. "America/Los_Angeles"). */
  timeZone?: string;
  /** Username to scope availability to. Defaults to authenticated user. */
  username?: string;
};

/**
 * Get available time slots for an event type within a window. Returns
 * timezone-aware slot timestamps the model can offer to the user.
 */
export default async function tool(input: Input): Promise<unknown> {
  const params: Record<string, unknown> = {
    eventTypeId: input.eventTypeId,
    start: input.start,
    end: input.end,
  };
  if (input.duration) params.duration = input.duration;
  if (input.timeZone) params.timeZone = input.timeZone;
  if (input.username) params.username = input.username;
  return calAPI({
    url: "/slots/available",
    headers: { "cal-api-version": "2024-09-04" },
    params,
  });
}
