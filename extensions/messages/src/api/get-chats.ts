import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";
import { fetchContactsForPhoneNumbers } from "swift:../../swift/contacts";

import { createContactMap, getContactOrGroupInfo, ChatOrMessageInfo, fuzzySearch } from "../helpers";
import { Chat, SQLChat } from "../hooks/useChats";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export async function getChats(searchText: string = ""): Promise<Chat[]> {
  const rawData = await executeSQL<SQLChat>(
    DB_PATH,
    `
    SELECT
      chat.guid,
      chat.chat_identifier,
      chat.display_name,
      chat.service_name,
      CASE
        WHEN chat.chat_identifier LIKE '%chat%' AND chat.display_name IS NOT NULL AND chat.display_name != ''
        THEN chat.display_name
      ELSE NULL
    END as group_name,
      CASE WHEN chat.chat_identifier LIKE '%chat%' THEN 1 ELSE 0 END as is_group,
      strftime('%Y-%m-%dT%H:%M:%fZ', datetime(
        MAX(message.date) / 1000000000 + strftime("%s", "2001-01-01"),
        "unixepoch"
      )) AS last_message_date,
      CASE
        WHEN chat.chat_identifier LIKE '%chat%' THEN GROUP_CONCAT(DISTINCT handle.id)
        ELSE handle.id
      END as group_participants
    FROM
      chat
      JOIN chat_message_join ON chat."ROWID" = chat_message_join.chat_id
      JOIN message ON chat_message_join.message_id = message."ROWID"
      LEFT JOIN chat_handle_join ON chat."ROWID" = chat_handle_join.chat_id
      LEFT JOIN handle ON chat_handle_join.handle_id = handle."ROWID"
    WHERE
      chat.chat_identifier LIKE '%chat%' OR chat.chat_identifier LIKE '+%'
    GROUP BY
      chat.chat_identifier
    ORDER BY
      last_message_date DESC
    LIMIT 1000;
    `,
  );

  if (!rawData) return [];

  const uniqueChatIdentifiers = [...new Set(rawData.map((c) => c.chat_identifier))];
  const contacts = await fetchContactsForPhoneNumbers(uniqueChatIdentifiers);
  const contactMap = createContactMap(contacts);

  const chats = rawData.map((c) => {
    const chatInfo: ChatOrMessageInfo = {
      chat_identifier: c.chat_identifier,
      is_group: Boolean(c.is_group),
      display_name: c.display_name,
      group_participants: c.group_participants,
    };

    const { displayName, phoneNumber } = getContactOrGroupInfo(chatInfo, contactMap);

    return {
      ...c,
      displayName,
      phoneNumber,
      is_group: Boolean(c.is_group),
    };
  });

  if (!searchText) return chats.slice(0, 50);

  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  return chats
    .filter((c) => {
      const searchString = `${c.chat_identifier} ${c.displayName} ${c.group_participants || ""}`;
      return fuzzySearch(searchString, searchTerms);
    })
    .slice(0, 50);
}
