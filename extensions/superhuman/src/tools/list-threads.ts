import { callMcpTool } from "../lib/mcp";

/**
 * List recent email threads, optionally filtered by label or split.
 * For free-text search use search-inbox instead.
 */
type Input = {
  /**
   * Maximum number of threads to return (default decided by server, typically 20).
   */
  limit?: number;
  /**
   * Label or split id to filter by (e.g. "inbox", "starred", or a custom label/split id).
   */
  label?: string;
  /**
   * Pagination cursor returned by a previous call.
   */
  cursor?: string;
};

export default async function tool(input: Input): Promise<unknown> {
  const args: Record<string, unknown> = {};
  if (input.limit !== undefined) args.limit = input.limit;
  if (input.label) args.label = input.label;
  if (input.cursor) args.cursor = input.cursor;
  return callMcpTool("list_threads", args);
}
