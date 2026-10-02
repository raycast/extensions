import { chatMemberNames, chatTitle, findChats } from "../api/chat";

type Input = {
  /** Words from the chat title, participant name, or bot name. */
  query: string;
};

export default async function tool(input: Input) {
  const query = input.query.trim();
  if (!query) {
    throw new Error("A chat search query is required");
  }

  const chats = await findChats(query);
  return chats.map((chat) => ({
    id: chat.id,
    title: chatTitle(chat),
    type: chat.chatType,
    participants: chatMemberNames(chat),
    lastActivity: chat.lastMessagePreview?.createdDateTime ?? chat.createdDateTime,
    url: chat.webUrl,
  }));
}
