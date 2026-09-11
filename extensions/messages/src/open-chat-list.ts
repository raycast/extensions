import type { Image } from "@raycast/api";

import type { SQLChat } from "./chat-query";
import { buildChatSearchableText, fuzzySearch } from "./helpers";

const VISIBLE_CHAT_LIMIT = 50;

export type Chat = Omit<SQLChat, "is_group"> & {
  is_group: boolean;
  avatar?: Image.ImageLike;
  contactId?: string;
  displayName: string;
  phoneNumber?: string;
  searchableText?: string;
};

export function selectOpenChatRows(chats: readonly Chat[], searchText: string): Chat[] {
  const terms = searchText.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return chats.slice(0, VISIBLE_CHAT_LIMIT);

  return chats
    .filter((chat) => fuzzySearch(chat.searchableText ?? buildChatSearchableText(chat, chat.displayName), terms))
    .slice(0, VISIBLE_CHAT_LIMIT);
}
