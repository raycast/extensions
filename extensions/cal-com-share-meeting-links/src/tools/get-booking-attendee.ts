import { calAPI } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = {
  bookingUid: string;
  attendeeId: number;
};

export default async function tool(input: Input): Promise<unknown> {
  const uid = assertId(input.bookingUid, "bookingUid");
  const attendeeId = assertId(input.attendeeId, "attendeeId");
  return calAPI({
    url: `/bookings/${uid}/attendees/${attendeeId}`,
    headers: { "cal-api-version": "2026-02-25" },
  });
}
