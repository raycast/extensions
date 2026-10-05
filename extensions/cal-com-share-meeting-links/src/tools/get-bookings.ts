import { calAPI, type CalBooking } from "@api/cal.com";
import { formatBookingForAI } from "@/lib/ai-tools";

type Input = {
  /** "upcoming" | "unconfirmed" | "past" | "cancelled" | "recurring". Default: "upcoming". */
  status?: "upcoming" | "unconfirmed" | "past" | "cancelled" | "recurring";
  /** Sort order on start time. */
  sortStart?: "asc" | "desc";
  /** Page size (default 100). */
  take?: number;
  /** Skip count for pagination. */
  skip?: number;
  /** ISO 8601 — only bookings starting after this. */
  afterStart?: string;
  /** ISO 8601 — only bookings starting before this. */
  beforeStart?: string;
  /** Filter to attendees with this email. */
  attendeeEmail?: string;
  /** Filter to attendees with this name. */
  attendeeName?: string;
  /** Filter to a specific event type. */
  eventTypeId?: number;
};

/**
 * List bookings. Returns slim records (id, uid, title, start, end, hosts,
 * attendees, status, meetingUrl) optimized for AI context. Pass uid into
 * cancel_booking, reschedule_booking, etc.
 */
export default async function tool(input: Input) {
  const params: Record<string, unknown> = {
    status: input.status ?? "upcoming",
    sortStart: input.sortStart ?? "asc",
    take: input.take ?? 100,
  };
  if (input.skip !== undefined) params.skip = input.skip;
  if (input.afterStart) params.afterStart = input.afterStart;
  if (input.beforeStart) params.beforeStart = input.beforeStart;
  if (input.attendeeEmail) params.attendeeEmail = input.attendeeEmail;
  if (input.attendeeName) params.attendeeName = input.attendeeName;
  if (input.eventTypeId) params.eventTypeId = input.eventTypeId;

  const bookings = await calAPI<CalBooking[]>({
    url: "/bookings",
    headers: { "cal-api-version": "2026-02-25" },
    params,
  });
  return bookings.map(formatBookingForAI);
}
