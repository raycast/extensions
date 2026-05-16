import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { DiscardDraftInput, validate } from "../lib/validation";

/**
 * Permanently discard a Superhuman draft. Requires confirmation.
 */
type Input = {
  /** The id of the draft to discard. */
  draftId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = readOnlyConfirmation("discard-draft");
  if (blocked) return blocked;
  return {
    message: `Discard draft ${input.draftId}? This cannot be undone.`,
    image: "🗑️",
  };
};

export default async function tool(input: Input): Promise<unknown> {
  assertWritable("discard-draft");
  const parsed = validate(DiscardDraftInput, input);
  return callMcpTool("discard_draft", { draft_id: parsed.draftId });
}
