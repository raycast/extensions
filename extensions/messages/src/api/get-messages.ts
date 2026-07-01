import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";

import { buildMessagesQuery, decodeHexString, fuzzySearch, createContactMap, getContactOrGroupInfo } from "../helpers";
import type { Message, SQLMessage, ChatOrMessageInfo } from "../types";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export async function getMessages(searchText?: string, chatIdentifier?: string, before?: string): Promise<Message[]> {
  // Sanitize chatIdentifier: escape single quotes
  const safeChatIdentifier = chatIdentifier?.replace(/'/g, "''") ?? null;
  // Convert before to an Apple-epoch nanosecond integer
  const beforeNs =
    before && !isNaN(Date.parse(before))
      ? Math.floor((new Date(before).getTime() / 1000 - 978307200) * 1_000_000_000)
      : null;

  const rawData = await executeSQL<SQLMessage>(
    DB_PATH,
    buildMessagesQuery({
      chatIdentifierClause: safeChatIdentifier !== null ? `AND chat.chat_identifier = '${safeChatIdentifier}'` : "",
      beforeClause: beforeNs !== null ? `AND message.date < ${beforeNs}` : "",
    }),
  );

  if (!rawData) return [];

  const uniqueChatIdentifiers = [...new Set(rawData.map((m) => m.chat_identifier))];
  const { fetchContactsForPhoneNumbers } = await import("swift:../../swift/contacts");
  const contacts = await fetchContactsForPhoneNumbers(uniqueChatIdentifiers, false);
  const contactMap = createContactMap(contacts);

  const mapped = rawData.map((m) => {
    const decodedBody = decodeHexString(m.body);
    const decodedReply = m.reply_body ? decodeHexString(m.reply_body) : null;
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
      replyingTo: decodedReply || null,
    };
  });

  // Reverse to oldest-first, apply reply dedup filter.
  // Dedup: strip consecutive identical replyingTo to reduce noise.
  const messages = [...mapped].reverse();
  let prevReply: string | null = null;
  for (const msg of messages) {
    const originalReply = msg.replyingTo ?? null;
    if (msg.replyingTo && msg.replyingTo === prevReply) {
      msg.replyingTo = null;
    }
    prevReply = originalReply;
  }

  if (!searchText) return messages;

  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  return messages.filter((m) => {
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
  });
}
