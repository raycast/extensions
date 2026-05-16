import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Send an existing Superhuman draft. Requires confirmation because this action delivers email.
 * Use after draft-email has created or updated the draft you want to send.
 */
type Input = {
  /**
   * The id of the draft to send (returned by draft-email).
   */
  draftId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Send draft ${input.draftId}?`,
  image: "📤",
});

export default async function tool(input: Input): Promise<unknown> {
  return callMcpTool("send_draft", { draft_id: input.draftId });
}
