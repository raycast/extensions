import { callMcpTool } from "../lib/mcp";
import { injectThreadUrls } from "../lib/user";
import { GetThreadInput, validate } from "../lib/validation";

/**
 * Fetch a full email thread. When `messageLimit` is set and the thread has
 * more messages than the limit, the server returns the root message plus
 * the newest (messageLimit - 1) messages.
 */
type Input = {
  /** The id of the thread to fetch. */
  threadId: string;
  /** Include thread comments (Superhuman "Comments" annotations). */
  includeComments?: boolean;
  /** Include draft messages on the thread. */
  includeDrafts?: boolean;
  /** Cap the number of messages returned (1–100). */
  messageLimit?: number;
};

export default async function tool(input: Input): Promise<unknown> {
  const parsed = validate(GetThreadInput, input);
  const args: Record<string, unknown> = { thread_id: parsed.threadId };
  if (parsed.includeComments !== undefined) args.include_comments = parsed.includeComments;
  if (parsed.includeDrafts !== undefined) args.include_drafts = parsed.includeDrafts;
  if (parsed.messageLimit !== undefined) args.message_limit = parsed.messageLimit;
  const result = await callMcpTool("get_thread", args);
  return injectThreadUrls(result);
}
