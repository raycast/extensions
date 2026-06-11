import { Tool } from "@raycast/api";
import { calAPI } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = {
  bookingUid: string;
  name: string;
  email: string;
  /** IANA timezone. */
  timeZone: string;
  /** BCP47 locale. Defaults to "en". */
  locale?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Add ${input.name} <${input.email}> as an attendee to booking ${input.bookingUid}?`,
    image: "➕",
  });

export default async function tool(input: Input): Promise<unknown> {
  const uid = assertId(input.bookingUid, "bookingUid");
  return calAPI({
    method: "POST",
    url: `/bookings/${uid}/attendees`,
    headers: { "cal-api-version": "2026-02-25" },
    data: {
      name: input.name,
      email: input.email,
      timeZone: input.timeZone,
      ...(input.locale ? { locale: input.locale } : {}),
    },
  });
}
