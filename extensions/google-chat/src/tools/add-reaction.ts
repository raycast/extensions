import { Tool } from "@raycast/api";

import { addReaction as createReaction, getMessage } from "../api/chat";
import { withGoogleAuth } from "../api/google";
import { chatToPlainText, truncate } from "../helpers/chat-format";
import { senderName } from "../helpers/message-view";

type Input = {
  /**
   * The message resource name, like "spaces/AAAA/messages/BBBB.CCCC", from get-messages, get-unread or search-messages.
   */
  message: string;
  /**
   * A single Unicode emoji, e.g. "👍".
   */
  emoji: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  let preview = input.message;
  try {
    const message = await getMessage(input.message);
    preview = `${senderName(message)}: ${truncate(chatToPlainText(message.text), 120)}`;
  } catch {
    // Show the resource name if the message can't be read.
  }
  return {
    message: `React ${input.emoji} to this message?`,
    info: [
      { name: "Message", value: preview },
      { name: "Reaction", value: input.emoji },
    ],
  };
};

/** Adds an emoji reaction to a message. */
async function addReaction(input: Input) {
  if (!/^spaces\/[^/]+\/messages\/[^/]+$/.test(input.message)) {
    throw new Error("message must be a resource name like spaces/AAAA/messages/BBBB");
  }
  const reaction = await createReaction(input.message, input.emoji.trim());
  return { reaction: reaction.name, emoji: reaction.emoji.unicode ?? input.emoji };
}

export default withGoogleAuth(addReaction);
