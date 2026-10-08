import { calAPI, type CalBooking } from "@api/cal.com";
import { assertId, formatBookingForAI } from "@/lib/ai-tools";

type Input = {
  /** Booking UID (NOT numeric id). Look up via get_bookings if unknown. */
  bookingUid: string;
};

export default async function tool(input: Input) {
  const uid = assertId(input.bookingUid, "bookingUid");
  const booking = await calAPI<CalBooking>({
    url: `/bookings/${uid}`,
    headers: { "cal-api-version": "2026-02-25" },
  });
  return formatBookingForAI(booking);
}
