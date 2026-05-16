import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { MarkSpamInput, validate } from "../lib/validation";

/**
 * Mark a thread as spam.
 *
 * The `alsoBlockSender`, `alsoBlockDomain`, and `alsoTrash` flags trigger
 * a background bulk-spam sweep: existing inbox threads from the same
 * sender or domain are trashed in the same operation.
 */
type Input = {
  /** The id of the thread to mark as spam. */
  threadId: string;
  /** Also block future mail from this sender's email address. */
  alsoBlockSender?: boolean;
  /** Also block future mail from this sender's entire domain. */
  alsoBlockDomain?: boolean;
  /** Also trash existing inbox threads from this sender/domain. */
  alsoTrash?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = readOnlyConfirmation("mark-spam");
  if (blocked) return blocked;
  const info: { name: string; value: string }[] = [{ name: "Thread", value: input.threadId }];
  if (input.alsoBlockSender) info.push({ name: "Side effect", value: "Block sender" });
  if (input.alsoBlockDomain) info.push({ name: "Side effect", value: "Block entire domain" });
  if (input.alsoTrash) info.push({ name: "Side effect", value: "Bulk-trash existing inbox threads from sender" });
  return {
    message: `Mark thread ${input.threadId} as spam?`,
    image: "🚫",
    info,
  };
};

export default async function tool(input: Input): Promise<unknown> {
  assertWritable("mark-spam");
  const parsed = validate(MarkSpamInput, input);
  const args: Record<string, unknown> = { thread_id: parsed.threadId };
  if (parsed.alsoBlockSender) args.also_block_sender = true;
  if (parsed.alsoBlockDomain) args.also_block_domain = true;
  if (parsed.alsoTrash) args.also_trash = true;
  return callMcpTool("mark_spam", args);
}
