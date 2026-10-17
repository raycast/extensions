import { getMessagePage } from "../api/get-message-page";

type Input = {
  /**
   * Optional text to filter messages by. Matches message text, sender, group, and attachment metadata.
   * Leave empty to fetch the most recent messages without filtering.
   */
  searchText?: string;
  /**
   * Scope results to a specific conversation.
   * Use the `chatIdentifier` from `search-chats` to get this value.
   * Example: "+1234567890" for SMS or "iMessage;-;email@example.com" for iMessage
   */
  chatIdentifier?: string;
  /**
   * Stable chat GUID from search-chats. Prefer this over chatIdentifier when available.
   */
  chatGuid?: string;
  /** Opaque nextCursor returned by the previous call with the same filters. */
  cursor?: string;
  /** Include messages at or after this ISO 8601 date-time. */
  from?: string;
  /** Include messages before this ISO 8601 date-time. */
  to?: string;
  /** Only return unread incoming messages. */
  unreadOnly?: boolean;
  /** Maximum messages to return, from 1 to 100. */
  limit?: number;
};

/**
 * Fetches a stable page of iMessage/SMS messages in chronological order.
 * Tapbacks and reactions are excluded. Reply context and attachment metadata are included.
 */
export default async function (input: Input) {
  try {
    const page = await getMessagePage(input);

    if (page.messages.length === 0) {
      if (page.nextCursor) {
        return {
          messages: [],
          nextCursor: page.nextCursor,
          scannedMessageCount: page.scannedMessageCount,
        };
      }

      return "No messages were found.";
    }

    return {
      messages: page.messages.map((message) => ({
        sender: message.is_from_me ? "You" : message.senderName,
        date: message.date,
        text: message.body,
        ...(message.group_name ? { group: message.group_name } : {}),
        ...(message.replyingTo ? { replyingTo: message.replyingTo } : {}),
        ...(message.attachments.length
          ? {
              attachments: message.attachments.map((attachment) => ({
                name: attachment.name,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
              })),
            }
          : {}),
      })),
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
      scannedMessageCount: page.scannedMessageCount,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("database")) {
      return "Cannot access iMessage database. Please grant Full Disk Access to Raycast in System Settings → Privacy & Security → Full Disk Access.";
    }

    return `Could not search messages: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
