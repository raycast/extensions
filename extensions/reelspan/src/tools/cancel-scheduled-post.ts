import { Tool } from "@raycast/api";
import { client } from "../lib/client";

type Input = {
  /** The scheduled post's job ID (from get-scheduled-posts) */
  jobId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Cancel this scheduled post? It will not be published.",
  info: [{ name: "Job ID", value: input.jobId }],
});

/** Cancels a scheduled post. */
export default async function tool(input: Input) {
  return client().scheduled.cancel(input.jobId);
}
