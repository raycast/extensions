import { client } from "../lib/client";

type Input = {
  /** Only this profile username */
  profile?: string;
};

/** Posts waiting for their scheduled time. */
export default async function tool(input: Input) {
  return client().scheduled.list({ profile_username: input.profile });
}
