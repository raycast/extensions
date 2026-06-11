import { calAPI } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = { bookingUid: string };

export default async function tool(input: Input): Promise<unknown> {
  const uid = assertId(input.bookingUid, "bookingUid");
  return calAPI({
    url: `/bookings/${uid}/attendees`,
    headers: { "cal-api-version": "2026-02-25" },
  });
}
