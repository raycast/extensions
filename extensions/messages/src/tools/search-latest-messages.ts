import { getMessages } from "../api/get-messages";

type Input = {
  /**
   * Optional text to filter messages by. Matches against message text, sender name, and group name.
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
   * ISO 8601 cursor for pagination. To load older messages, pass the `date` of
   * the first (oldest) message in the previous response — that is, the message at index 0,
   * since results are returned oldest-first.
   * Example: "2025-01-23T09:00:00.000Z"
   */
  before?: string;
};

/**
 * Fetches up to 50 messages from iMessage/SMS, returned in chronological order (oldest first, newest last).
 * Tapbacks and reactions are excluded. Reply context is included when available.
 * Use `before` for cursor-based pagination to load older messages.
 */
export default async function (input: Input) {
  try {
    const messages = await getMessages(input.searchText, input.chatIdentifier, input.before);

    if (messages.length === 0) {
      return "No messages were found.";
    }

    // Return a compact AI-oriented format, oldest-first (already reversed in get-messages)
    return messages.map((m) => ({
      sender: m.is_from_me ? "You" : m.senderName,
      date: m.date,
      text: m.body,
      ...(m.group_name ? { group: m.group_name } : {}),
      ...(m.replyingTo ? { replyingTo: m.replyingTo } : {}),
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("database")) {
      return "Cannot access iMessage database. Please grant Full Disk Access to Raycast in System Settings → Privacy & Security → Full Disk Access.";
    }

    return "An error occurred while searching for messages";
  }
}
