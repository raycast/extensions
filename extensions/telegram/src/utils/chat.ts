import { Chat } from "../services/telegram-client";

export function groupChatsByPinned(chats: Chat[]): Map<string, Chat[]> {
  const groups = new Map<string, Chat[]>();

  const pinnedChats = chats.filter((chat) => chat.isPinned);
  const unpinnedChats = chats.filter((chat) => !chat.isPinned);

  const sortByDate = (a: Chat, b: Chat) => {
    if (!a.lastMessage?.date && !b.lastMessage?.date) return 0;
    if (!a.lastMessage?.date) return 1;
    if (!b.lastMessage?.date) return -1;
    return b.lastMessage.date.getTime() - a.lastMessage.date.getTime();
  };

  pinnedChats.sort(sortByDate);
  unpinnedChats.sort(sortByDate);

  if (pinnedChats.length > 0) {
    groups.set("Pinned", pinnedChats);
  }

  if (unpinnedChats.length > 0) {
    groups.set("All Chats", unpinnedChats);
  }

  return groups;
}
