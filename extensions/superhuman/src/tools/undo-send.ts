import { callMcpTool } from "../lib/mcp";

/**
 * Undo the most recently sent message if Superhuman's undo-send window has not elapsed.
 * Use this immediately after a send when the user says "wait" or "undo".
 */
type Input = {
  /**
   * The id of the sent message to recall. Omit to undo the most recent send.
   */
  messageId?: string;
};

export default async function tool(input: Input): Promise<unknown> {
  const args: Record<string, unknown> = {};
  if (input.messageId) args.message_id = input.messageId;
  return callMcpTool("undo_send", args);
}
