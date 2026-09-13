/**
 * `buzz://message` link building, mirroring
 * `desktop/src/features/messages/lib/messageLink.ts` in block/buzz so a link
 * built here behaves exactly like one copied from the Buzz app.
 *
 * Format: buzz://message?channel=<uuid>&id=<eventId>
 *
 * The optional `thread` param that format also allows is deliberately omitted:
 * our Message carries no thread reference, and neither the desktop nor the
 * mobile handler consumes it today.
 */

const SCHEME = "buzz:";
const HOST = "message";

/**
 * A syntactically valid event id that cannot exist.
 *
 * Buzz has no `buzz://channel` host, but its deep-link parser only requires
 * `channel` and `id` to be present and non-empty, never to resolve, and the app
 * opens the channel normally when the anchor is not found. Verified against the
 * desktop app on 2026-07-30. That is what lets a channel be opened with no
 * relay query at all.
 *
 * Safe to open, not safe to share: pasted into a Buzz conversation this would
 * render as a link to a message that does not exist, which is why Copy Link is
 * offered for messages only.
 */
export const ANCHORLESS_MESSAGE_ID = "0".repeat(64);

export function buildMessageLink(channelId: string, messageId: string): string {
  if (!channelId) {
    throw new Error("buildMessageLink: channelId is required");
  }
  if (!messageId) {
    throw new Error("buildMessageLink: messageId is required");
  }
  const params = new URLSearchParams();
  params.set("channel", channelId);
  params.set("id", messageId);
  return `${SCHEME}//${HOST}?${params.toString()}`;
}

export function buildChannelLink(channelId: string): string {
  return buildMessageLink(channelId, ANCHORLESS_MESSAGE_ID);
}
