import { calAPI, type CalSchedule } from "@api/cal.com";

// eslint-disable-next-line @typescript-eslint/ban-types
type Input = {};

export default async function tool(input: Input): Promise<CalSchedule> {
  void input;
  return calAPI<CalSchedule>({
    url: "/schedules/default",
    headers: { "cal-api-version": "2024-06-11" },
  });
}
