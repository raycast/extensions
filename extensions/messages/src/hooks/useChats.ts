import { homedir } from "os";
import { resolve } from "path";

import { Image } from "@raycast/api";
import { useSQL } from "@raycast/utils";

import { fuzzySearch, getDisplayNameAndAvatar } from "../helpers";
import { useContacts } from "../hooks/useContacts";

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
  avatar: Image.ImageLike;
  displayName: string;
};

export function useChats(searchText: string = "") {
  const { contactMap } = useContacts();
  const { data: rawData, ...rest } = useSQL<SQLChat>(
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
    { permissionPriming: "This is required to read your chats." },
  );

  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  const data = rawData
    ?.map((c) => {
      const { displayName, avatar } = getDisplayNameAndAvatar(c, contactMap);
      return {
        ...c,
        avatar,
        displayName,
        is_group: Boolean(c.is_group),
      };
    })
    .filter((c) => {
      if (searchTerms.length === 0) return true;
      const searchString = `${c.chat_identifier} ${c.displayName} ${c.group_participants || ""}`;
      return fuzzySearch(searchString, searchTerms);
    })
    .slice(0, 50);

  return {
    data,
    ...rest,
  };
}
