import { Tool } from "@raycast/api";
import { calAPI, type CalBooking } from "@api/cal.com";
import { confirmDestructive, formatBookingForAI } from "@/lib/ai-tools";

function parseJsonArg(s: string, name: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    throw new Error(`${name} must be valid JSON.`);
  }
}

type Input = {
  /** Event type id to book. */
  eventTypeId: number;
  /** ISO 8601 start time (must include timezone, e.g. "2026-06-01T14:00:00Z"). */
  start: string;
  /** IANA timezone, e.g. "America/Los_Angeles". */
  attendeeTimeZone: string;
  /** Attendee's name. */
  attendeeName: string;
  /** Attendee's email. */
  attendeeEmail: string;
  /** Optional booking title override. */
  title?: string;
  /** Optional meeting URL override. */
  location?: string;
  /** Phone number for SMS notifications. */
  attendeePhoneNumber?: string;
  /** Additional booking-field responses (event type's custom questions) as a JSON-encoded object keyed by field slug. */
  bookingFieldsResponsesJson?: string;
  /** Optional metadata as a JSON-encoded object. */
  metadataJson?: string;
  /** Cal.com user id to book — defaults to event type owner. */
  userId?: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Create booking on event type ${input.eventTypeId} at ${input.start} for ${input.attendeeName} <${input.attendeeEmail}>?`,
    image: "📆",
  });

export default async function tool(input: Input) {
  const booking = await calAPI<CalBooking>({
    method: "POST",
    url: "/bookings",
    headers: { "cal-api-version": "2026-02-25" },
    data: {
      eventTypeId: input.eventTypeId,
      start: input.start,
      attendee: {
        name: input.attendeeName,
        email: input.attendeeEmail,
        timeZone: input.attendeeTimeZone,
        ...(input.attendeePhoneNumber ? { phoneNumber: input.attendeePhoneNumber } : {}),
      },
      ...(input.title ? { title: input.title } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.bookingFieldsResponsesJson
        ? { bookingFieldsResponses: parseJsonArg(input.bookingFieldsResponsesJson, "bookingFieldsResponsesJson") }
        : {}),
      ...(input.metadataJson ? { metadata: parseJsonArg(input.metadataJson, "metadataJson") } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
    },
  });
  return formatBookingForAI(booking);
}
