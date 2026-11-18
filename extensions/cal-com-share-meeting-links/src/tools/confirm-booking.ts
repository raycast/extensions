import { Tool } from "@raycast/api";
import { confirmBooking } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = { bookingUid: string };

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Confirm pending booking ${input.bookingUid}?`,
    image: "✅",
  });

export default async function tool(input: Input): Promise<unknown> {
  const uid = assertId(input.bookingUid, "bookingUid");
  return confirmBooking(uid);
}
