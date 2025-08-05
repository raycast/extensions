import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";
import { fetchContactsForPhoneNumbers } from "swift:../../swift/contacts";

import { decodeHexString, fuzzySearch } from "../helpers";
import { createContactMap, getContactOrGroupInfo, ChatOrMessageInfo } from "../helpers";
import { Message, SQLMessage } from "../hooks/useMessages";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export async function getMessages(searchText?: string, chatIdentifier?: string): Promise<Message[]> {
  const rawData = await executeSQL<SQLMessage>(
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
      ${chatIdentifier ? `AND chat.chat_identifier = '${chatIdentifier}'` : ""}
    GROUP BY
      message.guid
    ORDER BY
      date DESC
    LIMIT 100
    `,
  );

  if (!rawData) return [];

  const uniqueChatIdentifiers = [...new Set(rawData.map((m) => m.chat_identifier))];
  const contacts = await fetchContactsForPhoneNumbers(uniqueChatIdentifiers);
  const contactMap = createContactMap(contacts);

  const messages = rawData.map((m) => {
    const decodedBody = decodeHexString(m.body);
    const messageInfo: ChatOrMessageInfo = {
      chat_identifier: m.chat_identifier,
      is_from_me: Boolean(m.is_from_me),
      is_group: Boolean(m.is_group),
      display_name: m.group_name,
      group_participants: m.group_participants,
    };

    const { displayName } = getContactOrGroupInfo(messageInfo, contactMap);

    return {
      ...m,
      body: decodedBody,
      sender: m.chat_identifier,
      senderName: displayName,
      is_from_me: Boolean(m.is_from_me),
      is_audio_message: Boolean(m.is_audio_message),
      is_sent: Boolean(m.is_sent),
      is_read: m.is_sent ? true : Boolean(m.is_read),
    };
  });

  if (!searchText) return messages.slice(0, 50);

  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  return messages
    .filter((m) => {
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
}
