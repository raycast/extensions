import { Action, Tool } from "@raycast/api";
import { client } from "../lib/client";
import { networkName } from "../lib/reelspan";

type Input = {
  /** The scheduled post's job ID (from get-scheduled-posts) */
  jobId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Show which post this is when Reelspan can tell us; the job ID alone is enough to confirm.
  const job = await client()
    .scheduled.get(input.jobId)
    .catch(() => undefined);
  const post = (job?.scheduled_post ?? job?.job ?? job) as Record<string, unknown> | undefined;
  const text = typeof post?.title === "string" ? post.title : undefined;
  const when = typeof post?.scheduled_date === "string" ? new Date(post.scheduled_date).toLocaleString() : undefined;
  const platforms = Array.isArray(post?.platforms)
    ? (post.platforms as string[]).map(networkName).join(", ")
    : undefined;
  return {
    style: Action.Style.Destructive,
    message: "Cancel this scheduled post? It will not be published.",
    info: [
      { name: "Job ID", value: input.jobId },
      { name: "Text", value: text || undefined },
      { name: "Networks", value: platforms || undefined },
      { name: "Scheduled For", value: when },
    ],
  };
};

/** Cancels a scheduled post. */
export default async function tool(input: Input) {
  return client().scheduled.cancel(input.jobId);
}
