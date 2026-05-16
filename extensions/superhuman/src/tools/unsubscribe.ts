import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { UnsubscribeInput, validate } from "../lib/validation";

/**
 * Unsubscribe from the mailing list that sent a given thread. Requires
 * confirmation.
 */
type Input = {
  /** The id of the thread whose sender you want to unsubscribe from. */
  threadId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = readOnlyConfirmation("unsubscribe");
  if (blocked) return blocked;
  return {
    message: `Unsubscribe from the sender of thread ${input.threadId}?`,
    image: "✋",
  };
};

export default async function tool(input: Input): Promise<unknown> {
  assertWritable("unsubscribe");
  const parsed = validate(UnsubscribeInput, input);
  return callMcpTool("unsubscribe", { thread_id: parsed.threadId });
}
