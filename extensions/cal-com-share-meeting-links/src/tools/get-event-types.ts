import { calAPI, type CalEventType } from "@api/cal.com";

type Input = {
  /** Filter by user (id or username). Defaults to authenticated user. */
  username?: string;
};

/** List event types (booking link configurations) for a user. */
export default async function tool(input: Input): Promise<CalEventType[]> {
  return calAPI<CalEventType[]>({
    url: "/event-types",
    headers: { "cal-api-version": "2024-06-14" },
    params: input.username ? { username: input.username } : undefined,
  });
}
