import { callMcpTool } from "../lib/mcp";

/**
 * Get the Superhuman read-status feed: which recipients have opened recent tracked emails and when.
 */
type Input = {
  /**
   * Maximum number of read events to return.
   */
  limit?: number;
};

export default async function tool(input: Input): Promise<unknown> {
  const args: Record<string, unknown> = {};
  if (input.limit !== undefined) args.limit = input.limit;
  return callMcpTool("get_read_status_feed", args);
}
