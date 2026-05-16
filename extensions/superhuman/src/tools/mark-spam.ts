import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Mark a thread as spam. Requires confirmation.
 */
type Input = {
  /**
   * The id of the thread to mark as spam.
   */
  threadId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Mark thread ${input.threadId} as spam?`,
  image: "🚫",
});

export default async function tool(input: Input): Promise<unknown> {
  return callMcpTool("mark_spam", { thread_id: input.threadId });
}
