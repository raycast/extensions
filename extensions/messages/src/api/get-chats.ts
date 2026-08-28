import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";
import { fetchContactsForChatIdentifiers } from "swift:../../swift/contacts";

import { collapseChatRows } from "../chat-collapse";
import { buildChatQuery, type SQLChat } from "../chat-query";
import { createContactMap } from "../contact-map-persist";
import { buildChatSearchableText, getContactLookupIdentifiers, getContactOrGroupInfo, fuzzySearch } from "../helpers";
import type { Chat } from "../open-chat-list";
import type { ChatOrMessageInfo } from "../types";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export async function getChats(searchText: string = ""): Promise<Chat[]> {
  const rawData = await executeSQL<SQLChat>(DB_PATH, buildChatQuery());

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
  const contacts = await fetchContactsForChatIdentifiers(lookupIdentifiers);
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
  const chats = collapseChatRows(hydratedChats);

  if (!searchText) return chats.slice(0, 50);

  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  return chats
    .filter((c) => {
      const searchString = c.searchableText ?? buildChatSearchableText(c, c.displayName);
      return fuzzySearch(searchString, searchTerms);
    })
    .slice(0, 50);
}
