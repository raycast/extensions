import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";
import { fetchContactsForChatIdentifiers } from "swift:../../swift/contacts";

import {
  buildMessagesQuery,
  createContactMap,
  decodeHexString,
  fuzzySearch,
  getContactLookupIdentifiers,
  getContactOrGroupInfo,
} from "../helpers";
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

  const messageInfos = rawData.map((m) => {
    const decodedBody = decodeHexString(m.body);
    const decodedReply = m.reply_body ? decodeHexString(m.reply_body) : null;
    const messageInfo: ChatOrMessageInfo = {
      chat_identifier: m.chat_identifier,
      is_from_me: Boolean(m.is_from_me),
      is_group: Boolean(m.is_group),
      display_name: m.group_name,
      group_participants: m.group_participants,
    };

    return { message: m, decodedBody, info: messageInfo, replyingTo: decodedReply || null };
  });

  const lookupIdentifiers = [...new Set(messageInfos.flatMap(({ info }) => getContactLookupIdentifiers(info)))];
  const contacts = await fetchContactsForChatIdentifiers(
    lookupIdentifiers,
    false,
    process.env.MESSAGES_CONTACT_MATCH_STRATEGY ?? "predicate-concurrent",
  );
  const contactMap = createContactMap(contacts);

  const mapped = messageInfos.map(({ message, decodedBody, info, replyingTo }) => {
    const { displayName, avatar } = getContactOrGroupInfo(info, contactMap);

    return {
      ...message,
      body: decodedBody,
      sender: message.chat_identifier,
      senderName: displayName,
      avatar,
      is_from_me: Boolean(message.is_from_me),
      is_audio_message: Boolean(message.is_audio_message),
      is_sent: Boolean(message.is_sent),
      is_read: message.is_sent ? true : Boolean(message.is_read),
      replyingTo,
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
