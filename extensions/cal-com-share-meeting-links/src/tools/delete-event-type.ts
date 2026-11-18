import { Tool } from "@raycast/api";
import { calAPI } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = { eventTypeId: number };

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Permanently delete event type ${input.eventTypeId}? Existing bookings of this type will be retained but no new bookings will be possible.`,
    image: "🗑️",
  });

export default async function tool(input: Input): Promise<unknown> {
  const id = assertId(input.eventTypeId, "eventTypeId");
  return calAPI<unknown>({
    method: "DELETE",
    url: `/event-types/${id}`,
    headers: { "cal-api-version": "2024-06-14" },
  });
}
