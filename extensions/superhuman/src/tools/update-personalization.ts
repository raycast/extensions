import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";
import { assertWritable, readOnlyConfirmation } from "../lib/readonly";
import { UpdatePersonalizationInput, validate } from "../lib/validation";

/**
 * Update Superhuman personalization by passing freeform feedback to
 * Superhuman's personalization endpoint. Examples:
 *
 *   "I prefer 'Hey' over 'Dear'"
 *   "My title is now VP Engineering"
 *   "Always sign off with 'Cheers, Andrew' on external emails"
 *
 * The server interprets the feedback and updates the relevant personalization
 * model.
 */
type Input = {
  /** Natural-language personalization feedback. */
  feedback: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const blocked = readOnlyConfirmation("update-personalization");
  if (blocked) return blocked;
  return {
    message: "Update Superhuman personalization?",
    image: "✍️",
    info: [{ name: "Feedback", value: input.feedback }],
  };
};

export default async function tool(input: Input): Promise<unknown> {
  assertWritable("update-personalization");
  const parsed = validate(UpdatePersonalizationInput, input);
  return callMcpTool("update_personalization", { feedback: parsed.feedback });
}
