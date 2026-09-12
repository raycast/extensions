import { Tool } from "@raycast/api";
import { cancelBooking } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = {
  bookingUid: string;
  /** Reason shared with attendees. */
  cancellationReason: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Cancel booking ${input.bookingUid}?\n\nReason: ${input.cancellationReason}`,
    image: "❌",
  });

export default async function tool(input: Input): Promise<unknown> {
  const uid = assertId(input.bookingUid, "bookingUid");
  const reason = input.cancellationReason?.trim();
  if (!reason) throw new Error("cancellationReason is required.");
  return cancelBooking(uid, reason);
}
