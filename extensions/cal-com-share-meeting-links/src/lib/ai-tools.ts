import type { CalBooking } from "@api/cal.com";

/**
 * Throw a clear error if a required tool input is missing or blank. Raycast
 * surfaces tool errors to the model, so a descriptive message helps it recover
 * (e.g. by calling get_bookings first to look up a uid).
 */
export function assertId(value: unknown, name: string): string {
  if (value == null) {
    throw new Error(`${name} is required.`);
  }
  const str = typeof value === "number" ? String(value) : String(value).trim();
  if (str === "") {
    throw new Error(`${name} is required.`);
  }
  return str;
}

/**
 * Slim a Cal.com v2 booking object for AI consumption. The raw payload includes
 * fields like `bookingFieldsResponses` and large nested metadata blobs that
 * burn context for no benefit; the model only needs ids, timing, status, and
 * who's involved to reason about the booking.
 */
export function formatBookingForAI(b: CalBooking) {
  return {
    id: b.id,
    uid: b.uid,
    title: b.title,
    description: b.description,
    start: b.start,
    end: b.end,
    durationMinutes: b.duration,
    status: b.status,
    meetingUrl: b.meetingUrl,
    location: b.location,
    hosts: b.hosts.map((h) => ({ id: h.id, name: h.name, email: h.email })),
    attendees: b.attendees.map((a) => ({ name: a.name, email: a.email, timeZone: a.timeZone })),
    eventTypeId: b.eventType?.id ?? null,
  };
}

/**
 * Standard confirmation payload for destructive tools.
 */
export function confirmDestructive(opts: { message: string; image?: string }) {
  return { message: opts.message, image: opts.image };
}
