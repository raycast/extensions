import { callMcpTool } from "../lib/mcp";
import { GetReadStatusFeedInput, validate } from "../lib/validation";

/**
 * Read-status events for tracked emails: who opened what, and when.
 * Filterable by thread, time window, with cursor-based pagination.
 */
type Input = {
  /** Restrict to a single thread's read events. */
  threadId?: string;
  /** Only return events since this RFC3339 timestamp. */
  since?: string;
  /** Max events to return (1–200). */
  limit?: number;
  /** Pagination cursor from a previous call. */
  cursor?: string;
};

export default async function tool(input: Input): Promise<unknown> {
  const parsed = validate(GetReadStatusFeedInput, input);
  const args: Record<string, unknown> = {};
  if (parsed.threadId) args.thread_id = parsed.threadId;
  if (parsed.since) args.since = parsed.since;
  if (parsed.limit !== undefined) args.limit = parsed.limit;
  if (parsed.cursor) args.cursor = parsed.cursor;
  return callMcpTool("get_read_status_feed", args);
}
