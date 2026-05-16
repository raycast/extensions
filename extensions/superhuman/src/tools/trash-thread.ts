import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { TrashThreadInput, validate } from "../lib/validation";

/**
 * Move a thread to trash. Requires confirmation.
 */
type Input = {
  /** The id of the thread to trash. */
  threadId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = readOnlyConfirmation("trash-thread");
  if (blocked) return blocked;
  return {
    message: `Move thread ${input.threadId} to trash?`,
    image: "🗑️",
  };
};

export default async function tool(input: Input): Promise<unknown> {
  assertWritable("trash-thread");
  const parsed = validate(TrashThreadInput, input);
  return callMcpTool("trash_thread", { thread_id: parsed.threadId });
}
