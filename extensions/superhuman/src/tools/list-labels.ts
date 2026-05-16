import { callMcpTool } from "../lib/mcp";

/**
 * List all labels in the user's Superhuman account.
 * Useful before calling update-thread or list-threads with a label filter.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
type Input = {};

export default async function tool(input: Input): Promise<unknown> {
  void input;
  return callMcpTool("list_labels", {});
}
