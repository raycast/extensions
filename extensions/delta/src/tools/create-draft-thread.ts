import { Action, Tool } from "@raycast/api";
import { createThread, openInDelta } from "../lib/delta";
import { getThreadDeeplink } from "../lib/threads";

type Input = {
  /**
   * The task for Delta's coding agent, written as the user's first message to it: what to build
   * or fix, where, and anything the user said about how. Keep the user's language and wording.
   */
  prompt: string;
  /**
   * Who can open the thread besides people the user invites: "private" (default, only people
   * invited) or "organization" (everyone in the user's current Delta organization). Use "organization" only when the user asks to share it.
   */
  visibility?: "private" | "organization";
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: Action.Style.Regular,
  message: "Create a Delta thread with this draft prompt and open it in Delta?",
  info: [
    { name: "Prompt", value: input.prompt },
    {
      name: "General Access",
      value: input.visibility === "organization" ? "Everyone in the Organization" : "Only People Invited",
    },
  ],
});

/**
 * Creates a Delta thread with the prompt saved as an unsent draft, in the user's current
 * organization, and opens it in Delta so the user can review and send it. The agent doesn't start
 * until the user sends the draft. Call it only when the user asks to create or start a thread.
 */
export default async function createDraftThread(input: Input) {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("The prompt is empty. Ask the user what the agent should work on.");
  }
  const threadId = await createThread({ prompt, visibility: input.visibility ?? "private" });
  const link = getThreadDeeplink({ id: threadId });
  // The thread exists either way; failing to bring Delta forward shouldn't report the whole call as failed.
  const opened = await openInDelta(link).then(
    () => true,
    () => false,
  );
  return {
    id: threadId,
    link,
    note: opened
      ? "The thread is open in Delta with the prompt as a draft; the user sends it from there."
      : "The thread was created with the prompt as a draft, but Delta couldn't be opened. Give the user the link.",
  };
}
