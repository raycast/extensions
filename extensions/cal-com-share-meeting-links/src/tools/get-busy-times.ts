import { calAPI } from "@api/cal.com";

type Input = {
  /** ISO 8601 start of window. */
  start: string;
  /** ISO 8601 end of window. */
  end: string;
  /** Cal.com username (defaults to authenticated user). */
  username?: string;
  /** Limit to a specific connected calendar credential id. */
  credentialId?: number;
};

/** Get busy times across the user's connected calendars. */
export default async function tool(input: Input): Promise<unknown> {
  const params: Record<string, unknown> = { start: input.start, end: input.end };
  if (input.username) params.username = input.username;
  if (input.credentialId) params.credentialId = input.credentialId;
  return calAPI({
    url: "/calendars/busy-times",
    params,
  });
}
