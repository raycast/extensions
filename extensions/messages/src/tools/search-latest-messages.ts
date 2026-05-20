import { getMessages } from "../api/get-messages";

type Input = {
  /**
   * The search text to search for in the messages list. Omit to get the latest messages.
   */
  searchText?: string;
  /**
   * Optional chat identifier to filter messages from a specific chat. You can find this by using the search-chats tool.
   * Example: "+1234567890" for SMS or "iMessage;-;email@example.com" for iMessage
   */
  chatIdentifier?: string;
  /**
   * ISO 8601 timestamp. Only return messages sent before this date.
   * Use the `date` field of the oldest message from a previous call to paginate backwards through the conversation history.
   * Example: "2025-01-23T09:00:00.000Z"
   */
  before?: string;
};

export default async function (input: Input) {
  try {
    const messages = await getMessages(input.searchText, input.chatIdentifier, input.before);

    if (messages.length === 0) {
      return "No messages were found.";
    }

    return messages;
  } catch (error) {
    if (error instanceof Error && error.message.includes("database")) {
      return "The user can't access the chat database";
    }

    return "An error occurred while searching for messages";
  }
}
