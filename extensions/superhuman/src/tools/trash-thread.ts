import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Move a thread to trash. Requires confirmation.
 */
type Input = {
  /**
   * The id of the thread to trash.
   */
  threadId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Move thread ${input.threadId} to trash?`,
  image: "🗑️",
});

export default async function tool(input: Input): Promise<unknown> {
  return callMcpTool("trash_thread", { thread_id: input.threadId });
}
