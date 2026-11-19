import { listMessages } from "../api/chat";
import { withGoogleAuth } from "../api/google";
import { loadUserNames, resolveRecipient } from "../api/spaces";
import { clampLimit, toolMessage, toolSpace } from "../helpers/ai";

type Input = {
  /**
   * The conversation: a space resource name like "spaces/AAAA", a Google Chat link, the exact space or DM title,
   * or a person's email for your direct message with them.
   */
  space: string;
  /**
   * How many recent messages to return, newest first. Defaults to 20, at most 100.
   */
  limit?: number;
};

/** Gets the most recent messages in one space or DM. */
async function getMessages(input: Input) {
  const item = await resolveRecipient(input.space, { createDm: false });
  const [page, names] = await Promise.all([
    listMessages(item.space.name, { pageSize: clampLimit(input.limit, 20, 100) }),
    loadUserNames(item.space).catch(() => ({})),
  ]);
  return {
    space: toolSpace(item),
    messages: (page.messages ?? []).map((message) => toolMessage(message, item, names)),
    hasMore: !!page.nextPageToken,
  };
}

export default withGoogleAuth(getMessages);
