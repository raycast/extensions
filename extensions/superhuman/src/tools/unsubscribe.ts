import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Unsubscribe from the mailing list that sent a given thread. Requires confirmation.
 */
type Input = {
  /**
   * The id of the thread whose sender you want to unsubscribe from.
   */
  threadId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Unsubscribe from the sender of thread ${input.threadId}?`,
  image: "✋",
});

export default async function tool(input: Input): Promise<unknown> {
  return callMcpTool("unsubscribe", { thread_id: input.threadId });
}
