import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { UndoSendInput, validate } from "../lib/validation";

/**
 * Recall a recently sent message. Pass the `undoToken` returned by
 * `send-draft` when `undoTimeout` was set (preferred), or fall back to
 * `messageId` for the most-recent-send semantics.
 */
type Input = {
  /** Undo token returned by `send-draft` (preferred). */
  undoToken?: string;
  /** Message id to recall when no token is available. */
  messageId?: string;
};

export const confirmation: Tool.Confirmation<Input> = async () => readOnlyConfirmation("undo-send");

export default async function tool(input: Input): Promise<unknown> {
  assertWritable("undo-send");
  const parsed = validate(UndoSendInput, input);
  const args: Record<string, unknown> = {};
  if (parsed.undoToken) args.undo_token = parsed.undoToken;
  if (parsed.messageId) args.message_id = parsed.messageId;
  return callMcpTool("undo_send", args);
}
