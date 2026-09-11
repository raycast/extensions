import { calAPI, type CalSchedule } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = { scheduleId: number };

export default async function tool(input: Input): Promise<CalSchedule> {
  const id = assertId(input.scheduleId, "scheduleId");
  return calAPI<CalSchedule>({
    url: `/schedules/${id}`,
    headers: { "cal-api-version": "2024-06-11" },
  });
}
