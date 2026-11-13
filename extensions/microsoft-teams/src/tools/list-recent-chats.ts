import { chatMemberNames, chatTitle, getRecentChats } from "../api/chat";

type Input = {
  /** Maximum number of recent chats to return. Defaults to 10 and cannot exceed 50. */
  maxResults?: number;
};

export default async function tool(input: Input) {
  const chats = await getRecentChats(input.maxResults);
  return chats.map((chat) => ({
    id: chat.id,
    title: chatTitle(chat),
    type: chat.chatType,
    participants: chatMemberNames(chat),
    lastActivity: chat.lastMessagePreview?.createdDateTime ?? chat.createdDateTime,
    url: chat.webUrl,
  }));
}
