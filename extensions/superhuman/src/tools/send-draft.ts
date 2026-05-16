import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { SendResponse } from "../lib/responses";
import { SendDraftInput, validate } from "../lib/validation";

/**
 * Send an existing Superhuman draft. Scheduling options are mutually
 * exclusive — provide at most one of `smartSend`, `sendAt`, or
 * `undoTimeout`.
 *
 * `undoTimeout` returns an `undoToken` + `undoExpiresAt` so a subsequent
 * `undo-send` call can recall the message before delivery.
 */
type Input = {
  /** The id of the draft to send (from `draft-email`). */
  draftId: string;
  /** Use Superhuman's "Send at optimal time" scheduler. */
  smartSend?: boolean;
  /** Schedule send for an explicit RFC3339 datetime. */
  sendAt?: string;
  /** Hold the send for N minutes (1–10) so it can be undone. */
  undoTimeout?: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = readOnlyConfirmation("send-draft");
  if (blocked) return blocked;
  const info: { name: string; value: string }[] = [{ name: "Draft", value: input.draftId }];
  if (input.smartSend) info.push({ name: "Schedule", value: "Smart send (optimal time)" });
  if (input.sendAt) info.push({ name: "Schedule", value: input.sendAt });
  if (input.undoTimeout) info.push({ name: "Undo window", value: `${input.undoTimeout} min` });
  return {
    message: `Send draft ${input.draftId}?`,
    image: "📤",
    info,
  };
};

export default async function tool(input: Input): Promise<SendResponse | unknown> {
  assertWritable("send-draft");
  const parsed = validate(SendDraftInput, input);

  const args: Record<string, unknown> = { draft_id: parsed.draftId };
  if (parsed.smartSend) args.smart_send = true;
  if (parsed.sendAt) args.send_at = parsed.sendAt;
  if (parsed.undoTimeout !== undefined) args.undo_timeout = parsed.undoTimeout;

  return callMcpTool<SendResponse>("send_draft", args);
}
