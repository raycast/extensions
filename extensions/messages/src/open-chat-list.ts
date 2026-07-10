import { Image } from "@raycast/api";

import type { SQLChat } from "./chat-query";
import type { AvatarKind } from "./helpers";
import {
  buildChatSearchableText,
  fuzzySearch,
  getContactLookupIdentifiers,
  getContactOrGroupInfo,
  type ChatOrMessageInfo,
  type Contact,
} from "./helpers";

export type { AvatarKind } from "./helpers";

export const VISIBLE_CHAT_LIMIT = 50;

export type Chat = Omit<SQLChat, "is_group"> & {
  is_group: boolean;
  avatar?: Image.ImageLike;
  avatarKind?: AvatarKind;
  contactId?: string;
  displayName: string;
  phoneNumber?: string;
  searchableText?: string;
};

export function chatInfo(chat: SQLChat | Chat): ChatOrMessageInfo {
  return {
    chat_identifier: chat.chat_identifier,
    is_group: Boolean(chat.is_group),
    display_name: chat.display_name,
    group_participants: chat.group_participants,
    group_photo_path: chat.group_photo_path,
  };
}

export function toFallbackChat(chat: SQLChat): Chat {
  const info = chatInfo(chat);
  const { avatar, avatarKind, displayName } = getContactOrGroupInfo(info, new Map());

  return {
    ...chat,
    avatar,
    avatarKind,
    displayName,
    is_group: Boolean(chat.is_group),
    searchableText: buildChatSearchableText(chat, displayName),
  };
}

export function hydrateChat(chat: SQLChat | Chat, contactMap: Map<string, Contact>): Chat {
  const info = chatInfo(chat);
  const { avatar, avatarKind, contactId, displayName, phoneNumber } = getContactOrGroupInfo(info, contactMap);

  return {
    ...chat,
    avatar,
    avatarKind,
    contactId,
    displayName,
    phoneNumber,
    is_group: Boolean(chat.is_group),
    searchableText: buildChatSearchableText(chat, displayName),
  };
}

export function selectVisibleChats(chats: Chat[], searchText: string): Chat[] {
  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  if (searchTerms.length === 0) {
    return chats.slice(0, VISIBLE_CHAT_LIMIT);
  }

  const matches: Chat[] = [];
  for (const chat of chats) {
    if (matches.length >= VISIBLE_CHAT_LIMIT) {
      break;
    }

    if (fuzzySearch(chat.searchableText ?? buildChatSearchableText(chat, chat.displayName), searchTerms)) {
      matches.push(chat);
    }
  }

  return matches;
}

export function lookupIdentifiersForChats(chats: readonly (SQLChat | Chat)[]): string[] {
  return [...new Set(chats.flatMap((chat) => getContactLookupIdentifiers(chatInfo(chat))))];
}

export function mergeContactMaps(base: Map<string, Contact>, incoming: Map<string, Contact>): Map<string, Contact> {
  if (incoming.size === 0) {
    return base;
  }

  const next = new Map(base);
  incoming.forEach((contact, identifier) => {
    next.set(identifier, contact);
  });
  return next;
}

export function markIdentifiersLookedUp(current: Set<string>, identifiers: readonly string[]): Set<string> {
  if (identifiers.length === 0) {
    return current;
  }

  const next = new Set(current);
  identifiers.forEach((identifier) => {
    next.add(identifier);
    next.add(identifier.toLowerCase());
  });
  return next;
}

export function isIdentifierLookedUp(lookedUp: Set<string>, identifier: string): boolean {
  return lookedUp.has(identifier) || lookedUp.has(identifier.toLowerCase());
}
