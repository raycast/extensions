import { Action, Tool } from "@raycast/api";
import { nyxe } from "../lib/raycast";
import { displayAddress } from "../lib/text";

type Input = {
  /**
   * The thread to archive, exactly as returned by search-mail or list-inbox.
   */
  threadId: string;
};

/**
 * Shown to the user before the thread moves. The subject and sender are read
 * from Nyxe, not taken from the model, so what's confirmed is what moves.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const thread = await nyxe().thread(input.threadId);
  const last = thread.messages[thread.messages.length - 1];
  return {
    style: Action.Style.Regular,
    message: "Archive this thread? It leaves your inbox but stays searchable.",
    info: [
      { name: "Subject", value: thread.subject ?? "(no subject)" },
      { name: "From", value: last ? last.from.map(displayAddress).join(", ") : undefined },
    ],
  };
};

/**
 * Archive a thread: move it out of the inbox into Archive. The user confirms
 * first.
 */
export default async function tool(input: Input) {
  const result = await nyxe().archive(input.threadId);
  return { archived: result.moved > 0, moved: result.moved };
}
