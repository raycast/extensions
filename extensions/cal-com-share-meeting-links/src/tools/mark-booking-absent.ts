import { Tool } from "@raycast/api";
import { calAPI } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = {
  bookingUid: string;
  /**
   * Optional per-attendee no-show list. Pass `attendees: [{ email, noShow: true }, ...]`
   * to mark specific attendees absent. Pass `host: true` to mark the host absent.
   */
  attendees?: Array<{ email: string; noShow: boolean }>;
  host?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Mark booking ${input.bookingUid} no-show?${input.attendees ? `\n\nAttendees: ${input.attendees.map((a) => a.email).join(", ")}` : ""}`,
    image: "🚫",
  });

export default async function tool(input: Input): Promise<unknown> {
  const uid = assertId(input.bookingUid, "bookingUid");
  return calAPI({
    method: "POST",
    url: `/bookings/${uid}/mark-no-show`,
    headers: { "cal-api-version": "2026-02-25" },
    data: {
      ...(input.attendees ? { attendees: input.attendees } : {}),
      ...(input.host !== undefined ? { host: input.host } : {}),
    },
  });
}
