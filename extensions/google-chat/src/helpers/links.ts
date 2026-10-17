/** Building links to Google Chat spaces and messages. Pure: no Raycast imports. */

import type { Message, Space } from "../api/types";

export const GOOGLE_CHAT_URL = "https://chat.google.com";

function lastSegment(name: string | undefined): string | undefined {
  return name?.split("/").pop() || undefined;
}

/** Link that opens a space: the API's `spaceUri` when present, else a chat.google.com URL. */
export function spaceUrl(space: Pick<Space, "name" | "spaceUri" | "spaceType">): string {
  if (space.spaceUri) return space.spaceUri;
  const id = lastSegment(space.name);
  if (!id) return GOOGLE_CHAT_URL;
  return `${GOOGLE_CHAT_URL}/${space.spaceType === "DIRECT_MESSAGE" ? "dm" : "room"}/${id}`;
}

/**
 * Link to a message, in the form the Chat web app uses: `{space link}/{thread id}/{message id}`.
 * Message ids from the API look like `{thread}.{message}` for replies; top-level messages share the thread id.
 */
export function messageUrl(
  space: Pick<Space, "name" | "spaceUri" | "spaceType">,
  message: Pick<Message, "name" | "thread">,
): string {
  const base = spaceUrl(space).split("?")[0].replace(/\/$/, "");
  const messageId = lastSegment(message.name);
  const threadId = lastSegment(message.thread?.name) ?? messageId?.split(".")[0];
  if (!messageId || !threadId) return base;
  const shortMessageId = messageId.includes(".") ? messageId.split(".").pop() : messageId;
  return `${base}/${threadId}/${shortMessageId}`;
}
