import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Permanently discard a Superhuman draft. Requires confirmation.
 */
type Input = {
  /**
   * The id of the draft to discard.
   */
  draftId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Discard draft ${input.draftId}? This cannot be undone.`,
  image: "🗑️",
});

export default async function tool(input: Input): Promise<unknown> {
  return callMcpTool("discard_draft", { draft_id: input.draftId });
}
