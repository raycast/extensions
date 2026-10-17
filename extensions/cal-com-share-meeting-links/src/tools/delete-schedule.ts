import { Tool } from "@raycast/api";
import { calAPI } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = { scheduleId: number };

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Permanently delete schedule ${input.scheduleId}? Event types referencing this schedule will fall back to your default.`,
    image: "🗑️",
  });

export default async function tool(input: Input): Promise<unknown> {
  const id = assertId(input.scheduleId, "scheduleId");
  return calAPI({
    method: "DELETE",
    url: `/schedules/${id}`,
    headers: { "cal-api-version": "2024-06-11" },
  });
}
