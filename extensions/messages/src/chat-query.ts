import { MessageFilterStatus } from "./constants";
import type { ChatParticipant } from "./types";

export type SQLChat = Omit<ChatParticipant, "is_group" | "latest_message_guid" | "group_photo_path"> & {
  guid: string;
  chat_row_id: number;
  service_name: "iMessage" | "SMS";
  group_id: string | null;
  original_group_id: string | null;
  is_filtered: number | null;
  is_group: boolean | number;
  latest_message_guid: string | null;
  group_photo_path: string | null;
  last_message_timestamp: number | string | null;
  last_message_date: string;
};

type ChatQueryOptions = {
  filterSpam?: boolean;
  filterUnknownSenders?: boolean;
  limit?: number;
};

export function buildChatQuery({
  filterSpam = false,
  filterUnknownSenders = false,
  limit = 1000,
}: ChatQueryOptions = {}) {
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
      chat.ROWID AS chat_row_id,
      chat.guid,
      chat.chat_identifier,
      NULLIF(TRIM(chat.display_name), '') AS display_name,
      chat.service_name,
      chat.group_id,
      chat.original_group_id,
      (
        SELECT latest_message.guid
        FROM chat_message_join latest_chat_message_join
        JOIN message latest_message ON latest_chat_message_join.message_id = latest_message."ROWID"
        WHERE latest_chat_message_join.chat_id = chat."ROWID"
        ORDER BY latest_chat_message_join.message_date DESC, latest_chat_message_join.message_id DESC
        LIMIT 1
      ) AS latest_message_guid,
      CASE
        WHEN chat.style = 43
          AND chat.properties IS NOT NULL
          AND instr(CAST(chat.properties AS TEXT), 'groupPhotoGuid') > 0
          AND instr(CAST(chat.properties AS TEXT), 'at_') > 0
        THEN (
          SELECT group_photo_attachment.filename
          FROM attachment group_photo_attachment
          WHERE group_photo_attachment.guid = CAST(substr(chat.properties, ((instr(hex(chat.properties), hex('at_')) + 1) / 2), 41) AS TEXT)
          LIMIT 1
        )
        ELSE NULL
      END AS group_photo_path,
      CASE
        WHEN EXISTS(SELECT 1 FROM pragma_table_info('chat') WHERE name='is_filtered')
        THEN chat.is_filtered
        ELSE NULL
      END AS is_filtered,
      CASE
        WHEN chat.style = 43 AND NULLIF(TRIM(chat.display_name), '') IS NOT NULL
        THEN NULLIF(TRIM(chat.display_name), '')
        ELSE NULL
      END AS group_name,
      CASE WHEN chat.style = 43 THEN 1 ELSE 0 END AS is_group,
      CAST(MAX(chat_message_join.message_date) AS TEXT) AS last_message_timestamp,
      strftime('%Y-%m-%dT%H:%M:%fZ', datetime(
        MAX(chat_message_join.message_date) / 1000000000 + strftime('%s', '2001-01-01'),
        'unixepoch'
      )) AS last_message_date,
      CASE
        WHEN chat.style = 43 THEN (
          SELECT GROUP_CONCAT(DISTINCT group_handle.id)
          FROM chat_handle_join group_chat_handle_join
          JOIN handle group_handle ON group_chat_handle_join.handle_id = group_handle."ROWID"
          WHERE group_chat_handle_join.chat_id = chat."ROWID"
        )
        ELSE (
          SELECT direct_handle.id
          FROM chat_handle_join direct_chat_handle_join
          JOIN handle direct_handle ON direct_chat_handle_join.handle_id = direct_handle."ROWID"
          WHERE direct_chat_handle_join.chat_id = chat."ROWID"
          LIMIT 1
        )
      END AS group_participants
    FROM
      chat
      JOIN chat_message_join ON chat."ROWID" = chat_message_join.chat_id
    WHERE
      chat.chat_identifier IS NOT NULL
      AND chat.chat_identifier != ''
      ${filters}
    GROUP BY
      chat.ROWID
    ORDER BY
      MAX(chat_message_join.message_date) DESC
    LIMIT ${limit};
  `;
}
