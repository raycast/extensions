import { client } from "../lib/client";
import { results } from "../lib/reelspan";

type Input = {
  /** The request ID returned when posting */
  requestId?: string;
  /** Or a scheduled post's job ID */
  jobId?: string;
};

/** Each network's result and link for a post. */
export default async function tool(input: Input) {
  const r = await client().posts.status(input);
  return { status: r.status, results: results(r) };
}
