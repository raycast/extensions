import { Tool } from "@raycast/api";
import { calAPI, type CalBooking } from "@api/cal.com";
import { assertId, confirmDestructive, formatBookingForAI } from "@/lib/ai-tools";

type Input = {
  /** Booking UID to reschedule. */
  bookingUid: string;
  /** New ISO 8601 start time. */
  start: string;
  /** Optional reschedule reason shown to attendees. */
  rescheduleReason?: string;
  /** Cal.com user id rescheduling (defaults to authenticated user). */
  rescheduledBy?: number;
  /** Update attendee's timezone for this booking. */
  attendeeTimeZone?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Reschedule booking ${input.bookingUid} to ${input.start}?${input.rescheduleReason ? `\n\nReason: ${input.rescheduleReason}` : ""}`,
    image: "🔄",
  });

export default async function tool(input: Input) {
  const uid = assertId(input.bookingUid, "bookingUid");
  const booking = await calAPI<CalBooking>({
    method: "POST",
    url: `/bookings/${uid}/reschedule`,
    headers: { "cal-api-version": "2026-02-25" },
    data: {
      start: input.start,
      ...(input.rescheduleReason ? { rescheduleReason: input.rescheduleReason } : {}),
      ...(input.rescheduledBy ? { rescheduledBy: input.rescheduledBy } : {}),
      ...(input.attendeeTimeZone ? { attendeeTimeZone: input.attendeeTimeZone } : {}),
    },
  });
  return formatBookingForAI(booking);
}
