import { homedir } from "os";
import { resolve } from "path";

import { Image } from "@raycast/api";
import { useSQL, usePromise } from "@raycast/utils";
import { fetchContactsForPhoneNumbers } from "swift:../../swift/contacts";

import { decodeHexString, fuzzySearch } from "../helpers";
import { ChatParticipant, createContactMap, getContactOrGroupInfo, ChatOrMessageInfo } from "../helpers";
import { Filter } from "../my-messages";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export type SQLMessage = ChatParticipant & {
  guid: string;
  date: string;
  date_read: string | null;
  body: string;
  service: "iMessage" | "SMS";
  is_audio_message: boolean;
  is_from_me: boolean;
  is_sent: boolean;
  is_read: boolean;
  attachment_filename: string | null;
  attachment_name: string | null;
  attachment_mime_type: string | null;
};

export type Message = SQLMessage & {
  avatar?: Image.ImageLike;
  sender: string;
  senderName: string;
};

export function useMessages(searchText?: string, filter?: Filter) {
  const filterClause = (() => {
    switch (filter) {
      case "unread":
        return "AND message.is_read = 0 AND message.is_from_me = 0";
      case "contacts":
        return "AND (chat.chat_identifier LIKE '%chat%' OR chat.chat_identifier LIKE '+%')";
      case "read":
        return "AND (message.is_read = 1 OR message.is_from_me = 1)";
      case "me":
        return "AND message.is_from_me = 1";
      case "audio":
        return "AND message.is_audio_message = 1";
      case "attachments":
        return "AND attachment.filename IS NOT NULL AND attachment.filename NOT LIKE '%.pluginPayloadAttachment'";
      default:
        return "";
    }
  })();

  const {
    data: rawData,
    isLoading: isLoadingMessages,
    ...rest
  } = useSQL<SQLMessage>(
    DB_PATH,
    `
    SELECT
      message.guid,
      strftime('%Y-%m-%dT%H:%M:%fZ', datetime(
        message.date / 1000000000 + strftime("%s", "2001-01-01"),
        "unixepoch"
      )) AS date,
      strftime('%Y-%m-%dT%H:%M:%fZ', datetime(
        message.date_read / 1000000000 + strftime("%s", "2001-01-01"),
        "unixepoch"
      )) AS date_read,
      message.is_from_me,
      message.is_audio_message,
      message.is_sent,
      message.is_read,
      chat.chat_identifier,
      chat.display_name,
      CASE
        WHEN chat.chat_identifier LIKE '%chat%' AND chat.display_name IS NOT NULL AND chat.display_name != ''
        THEN chat.display_name
        ELSE NULL
      END as group_name,
      message.service,
      hex(message.attributedBody) as body,
      CASE WHEN chat.chat_identifier LIKE '%chat%' THEN 1 ELSE 0 END as is_group,
      CASE
        WHEN chat.chat_identifier LIKE '%chat%' THEN GROUP_CONCAT(DISTINCT handle.id)
        ELSE handle.id
      END as group_participants,
      attachment.filename as attachment_filename,
      attachment.transfer_name as attachment_name,
      attachment.mime_type as attachment_mime_type
    FROM
      message
      JOIN chat_message_join ON message."ROWID" = chat_message_join.message_id
      JOIN chat ON chat_message_join.chat_id = chat."ROWID"
      LEFT JOIN chat_handle_join ON chat."ROWID" = chat_handle_join.chat_id
      LEFT JOIN handle ON chat_handle_join.handle_id = handle."ROWID"
      LEFT JOIN message_attachment_join ON message."ROWID" = message_attachment_join.message_id
      LEFT JOIN attachment ON message_attachment_join.attachment_id = attachment."ROWID"
    WHERE
      message.attributedBody IS NOT NULL
      ${filterClause}
    GROUP BY
      message.guid
    ORDER BY
      date DESC
    LIMIT ${searchText ? "1000" : "50"};
    `,
    { permissionPriming: "This is required to read your messages." },
  );

  const { data, isLoading: isLoadingContacts } = usePromise(
    async (rawMessages) => {
      if (!rawMessages) return [];

      const messages = rawMessages as SQLMessage[];

      const uniqueChatIdentifiers = [...new Set(messages.map((m) => m.chat_identifier))];
      const contacts = await fetchContactsForPhoneNumbers(uniqueChatIdentifiers);
      const contactMap = createContactMap(contacts);

      return messages.map((m) => {
        const decodedBody = decodeHexString(m.body);
        const messageInfo: ChatOrMessageInfo = {
          chat_identifier: m.chat_identifier,
          is_from_me: Boolean(m.is_from_me),
          is_group: Boolean(m.is_group),
          display_name: m.group_name,
          group_participants: m.group_participants,
        };

        const { avatar, displayName } = getContactOrGroupInfo(messageInfo, contactMap);

        return {
          ...m,
          body: decodedBody,
          sender: m.chat_identifier,
          senderName: displayName,
          avatar,
          is_from_me: Boolean(m.is_from_me),
          is_audio_message: Boolean(m.is_audio_message),
          is_sent: Boolean(m.is_sent),
          is_read: m.is_sent ? true : Boolean(m.is_read),
        };
      });
    },
    [rawData],
    { execute: !!rawData },
  );

  const searchTerms = searchText
    ?.toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  const filteredData = data
    ?.filter((m) => {
      if (!searchTerms) return true;

      const searchableText = [
        m.body,
        m.senderName,
        m.sender,
        m.is_from_me ? "me" : "",
        m.is_read ? "read" : "unread",
        m.is_audio_message ? "audio" : "",
        ...[m.attachment_mime_type?.split("/")],
      ]
        .join(" ")
        .toLowerCase();

      return fuzzySearch(searchableText, searchTerms);
    })
    .slice(0, 50);

  return {
    data: filteredData,
    isLoading: isLoadingMessages || isLoadingContacts,
    ...rest,
  };
}
