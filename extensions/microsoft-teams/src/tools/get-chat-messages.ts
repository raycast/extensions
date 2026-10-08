import { getChatMessages } from "../api/chat";

type Input = {
  /** Microsoft Graph chat ID returned by Search Chats or List Recent Chats. */
  chatId: string;
  /** Maximum number of messages to return. Defaults to 20 and cannot exceed 50. */
  maxResults?: number;
};

export default async function tool(input: Input) {
  const messages = await getChatMessages(input.chatId, input.maxResults);
  return messages.map((message) => ({
    id: message.id,
    sender: message.from?.user?.displayName ?? message.from?.application?.displayName ?? "Unknown",
    createdAt: message.createdDateTime,
    lastModifiedAt: message.lastModifiedDateTime,
    type: message.messageType,
    subject: message.subject,
    contentType: message.body.contentType,
    content: message.body.content,
    url: message.webUrl,
  }));
}
