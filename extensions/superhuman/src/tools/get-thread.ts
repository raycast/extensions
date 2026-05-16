import { callMcpTool } from "../lib/mcp";

/**
 * Fetch a full email thread (subject, participants, all messages) so the AI can read or summarize it.
 */
type Input = {
  /**
   * The id of the thread to fetch (typically returned by list-threads or search-inbox).
   */
  threadId: string;
};

export default async function tool(input: Input): Promise<unknown> {
  return callMcpTool("get_thread", { thread_id: input.threadId });
}
