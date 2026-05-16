import { callMcpTool } from "../lib/mcp";

/**
 * Fetch a single email message by id (headers, body, attachments metadata).
 */
type Input = {
  /**
   * The id of the message to fetch.
   */
  messageId: string;
};

export default async function tool(input: Input): Promise<unknown> {
  return callMcpTool("get_message", { message_id: input.messageId });
}
