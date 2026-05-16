import { Tool } from "@raycast/api";
import { callMcpTool } from "../lib/mcp";

/**
 * Update Superhuman personalization fields used by the assistant when composing email
 * (signature, voice/tone preferences, default greeting). Pass only fields you want to change.
 */
type Input = {
  /**
   * The user's preferred display/full name.
   */
  fullName?: string;
  /**
   * Email signature to append to outgoing email.
   */
  signature?: string;
  /**
   * Free-text description of the user's voice/tone preferences.
   */
  voice?: string;
  /**
   * Default greeting/salutation (e.g. "Hi", "Hello").
   */
  greeting?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const info: { name: string; value: string }[] = [];
  if (input.fullName !== undefined) info.push({ name: "Full name", value: input.fullName });
  if (input.signature !== undefined) info.push({ name: "Signature", value: input.signature });
  if (input.voice !== undefined) info.push({ name: "Voice", value: input.voice });
  if (input.greeting !== undefined) info.push({ name: "Greeting", value: input.greeting });
  if (info.length === 0) return undefined;
  return {
    message: "Update Superhuman personalization? These defaults affect every email the AI composes for you.",
    image: "✍️",
    info,
  };
};

export default async function tool(input: Input): Promise<unknown> {
  const args: Record<string, unknown> = {};
  if (input.fullName !== undefined) args.full_name = input.fullName;
  if (input.signature !== undefined) args.signature = input.signature;
  if (input.voice !== undefined) args.voice = input.voice;
  if (input.greeting !== undefined) args.greeting = input.greeting;
  return callMcpTool("update_personalization", args);
}
