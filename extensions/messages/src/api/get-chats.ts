import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";
import { fetchContactsForChatIdentifiers } from "swift:../../swift/contacts";

import { collapseChatRows } from "../chat-collapse";
import { buildChatQuery, type SQLChat } from "../chat-query";
import { createContactMap } from "../contact-map-persist";
import { buildChatSearchableText, getContactLookupIdentifiers, getContactOrGroupInfo, fuzzySearch } from "../helpers";
import { dateToAppleNanoseconds } from "../message-pagination";
import type { Chat } from "../open-chat-list";
import type { ChatOrMessageInfo, Contact } from "../types";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

type GetChatsOptions = {
  unreadOnly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  contacts?: Contact[];
};

export async function getChats(searchText: string = "", options: GetChatsOptions = {}): Promise<Chat[]> {
  const limit = options.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be an integer between 1 and 100.");
  }
  const fromNanoseconds = options.from ? dateToAppleNanoseconds(options.from, "from") : undefined;
  const toNanoseconds = options.to ? dateToAppleNanoseconds(options.to, "to") : undefined;
  if (fromNanoseconds && toNanoseconds && BigInt(fromNanoseconds) > BigInt(toNanoseconds)) {
    throw new Error("from must not be later than to.");
  }

  const rawData = await executeSQL<SQLChat>(
    DB_PATH,
    buildChatQuery({
      activityFromNanoseconds: fromNanoseconds,
      activityToNanoseconds: toNanoseconds,
    }),
  );

  if (!rawData) return [];

  const collapsedChats = collapseChatRows(rawData);
  const chatInfos = collapsedChats.map((c) => ({
    chat: c,
    info: {
      chat_identifier: c.chat_identifier,
      is_group: Boolean(c.is_group),
      display_name: c.display_name,
      group_participants: c.group_participants,
      group_photo_path: c.group_photo_path,
    } satisfies ChatOrMessageInfo,
  }));

  const lookupIdentifiers = [...new Set(chatInfos.flatMap(({ info }) => getContactLookupIdentifiers(info)))];
  const contacts = options.contacts ?? (await fetchContactsForChatIdentifiers(lookupIdentifiers));
  const contactMap = createContactMap(contacts);

  const hydratedChats = chatInfos.map(({ chat, info }) => {
    const { contactId, displayName, phoneNumber } = getContactOrGroupInfo(info, contactMap);

    return {
      ...chat,
      contactId,
      displayName,
      phoneNumber,
      is_group: Boolean(chat.is_group),
      searchableText: buildChatSearchableText(chat, displayName),
    };
  });
  const chats = collapseChatRows(hydratedChats).filter((chat) => {
    if (options.unreadOnly && !(Number(chat.unread_count) > 0)) return false;
    return true;
  });

  if (!searchText) return chats.slice(0, limit);

  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  return chats
    .filter((c) => {
      const searchString = c.searchableText ?? buildChatSearchableText(c, c.displayName);
      return fuzzySearch(searchString, searchTerms);
    })
    .slice(0, limit);
}
