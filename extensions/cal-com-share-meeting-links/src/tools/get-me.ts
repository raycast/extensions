import { calAPI, type CalUser } from "@api/cal.com";

// eslint-disable-next-line @typescript-eslint/ban-types
type Input = {};

/** Get the authenticated user's Cal.com profile. */
export default async function tool(input: Input): Promise<CalUser> {
  void input;
  return calAPI<CalUser>({ url: "/me" });
}
