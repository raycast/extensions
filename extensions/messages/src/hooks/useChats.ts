import { homedir } from "os";
import { resolve } from "path";

import { Image, getPreferenceValues } from "@raycast/api";
import { usePromise, useSQL } from "@raycast/utils";
import { fetchContactsForPhoneNumbers } from "swift:../../swift/contacts";

import { MessageFilterStatus } from "../constants";
import { fuzzySearch, createContactMap, getContactOrGroupInfo, ChatOrMessageInfo } from "../helpers";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export interface ChatParticipant {
  chat_identifier: string;
  service_name: "iMessage" | "SMS";
  group_name: string | null;
  display_name: string | null;
  group_participants: string | null;
  is_group: boolean;
}

export type SQLChat = ChatParticipant & {
  guid: string;
  last_message_date: string;
};

export type Chat = SQLChat & {
  avatar?: Image.ImageLike;
  displayName: string;
  phoneNumber?: string;
};

export function useChats(searchText: string = "") {
  const preferences = getPreferenceValues();
  const filterSpam = preferences.filterSpam ?? false;
  const filterUnknownSenders = preferences.filterUnknownSenders ?? false;

  // Build filter conditions synchronously (column check happens at query time)
  const buildQuery = () => {
    // Note: We can't check column existence here synchronously, so we use a safe approach
    // The column will be checked when executeSQL runs, and if it doesn't exist, the NULL fallback works
    let filters = "";
    const filterConditions: string[] = [];

    if (filterSpam) {
      filterConditions.push(`(chat.is_filtered IS NULL OR chat.is_filtered != ${MessageFilterStatus.SPAM})`);
    }
    if (filterUnknownSenders) {
      filterConditions.push(`(chat.is_filtered IS NULL OR chat.is_filtered != ${MessageFilterStatus.UNKNOWN_SENDER})`);
    }

    if (filterConditions.length > 0) {
      filters = `AND (${filterConditions.join(" AND ")})`;
    }

    return `
      SELECT
        chat.guid,
        chat.chat_identifier,
        chat.display_name,
        chat.service_name,
        CASE 
          WHEN EXISTS(SELECT 1 FROM pragma_table_info('chat') WHERE name='is_filtered')
          THEN chat.is_filtered
          ELSE NULL
        END as is_filtered,
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
        (chat.chat_identifier LIKE '%chat%' OR chat.chat_identifier LIKE '+%')
        ${filters}
      GROUP BY
        chat.chat_identifier
      ORDER BY
        last_message_date DESC
      LIMIT 1000;
    `;
  };

  const {
    data: rawData,
    isLoading: isLoadingChats,
    permissionView,
    ...rest
  } = useSQL<SQLChat>(DB_PATH, buildQuery(), {
    permissionPriming: "This is required to read your chats.",
  });

  const { data, isLoading: isLoadingContacts } = usePromise(
    async (rawChats) => {
      if (!rawChats) return [];

      const chats = rawChats as SQLChat[];

      const uniqueChatIdentifiers = [...new Set(chats.map((c) => c.chat_identifier))];
      const contacts = await fetchContactsForPhoneNumbers(uniqueChatIdentifiers);
      const contactMap = createContactMap(contacts);

      return chats.map((c) => {
        const chatInfo: ChatOrMessageInfo = {
          chat_identifier: c.chat_identifier,
          is_group: Boolean(c.is_group),
          display_name: c.display_name,
          group_participants: c.group_participants,
        };

        const { avatar, displayName } = getContactOrGroupInfo(chatInfo, contactMap);

        return {
          ...c,
          avatar,
          displayName,
          is_group: Boolean(c.is_group),
        };
      });
    },
    [rawData],
    { execute: !!rawData },
  );

  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  const filteredData = data
    ?.filter((c) => {
      if (searchTerms.length === 0) return true;
      const searchString = `${c.chat_identifier} ${c.displayName} ${c.group_participants || ""}`;
      return fuzzySearch(searchString, searchTerms);
    })
    .slice(0, 50);

  return {
    data: filteredData,
    isLoading: isLoadingChats || isLoadingContacts,
    permissionView,
    ...rest,
  };
}
