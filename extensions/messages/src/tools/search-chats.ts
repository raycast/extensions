import { searchMessageRecipients } from "../api/search-message-recipients";

type Input = {
  /**
   * Optional contact name, group name, phone number, or email address. Searches Contacts as well as existing chats.
   * Omit it to return recent chats.
   */
  searchTerm?: string;
  /** Only return chats with unread messages. */
  unreadOnly?: boolean;
  /** Only return chats active at or after this ISO 8601 date-time. */
  from?: string;
  /** Only return chats active before this ISO 8601 date-time. */
  to?: string;
  /** Maximum number of chats to return, from 1 to 100. */
  limit?: number;
};

export default async function (input: Input) {
  try {
    const recipients = await searchMessageRecipients(input.searchTerm, {
      unreadOnly: input.unreadOnly,
      from: input.from,
      to: input.to,
      limit: input.limit,
    });

    if (recipients.length === 0) {
      return "No matching chats or contacts were found.";
    }

    return {
      recipients,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("database")) {
      return "The user can't access the chat database";
    }

    return `Could not search chats: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
