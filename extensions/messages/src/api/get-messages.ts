import { homedir } from "os";
import { resolve } from "path";

import { executeSQL } from "@raycast/utils";
import { fetchContactsForChatIdentifiers } from "swift:../../swift/contacts";

import { createContactMap } from "../contact-map-persist";
import {
  buildMessagesQuery,
  decodeMessageBody,
  fuzzySearch,
  getContactOrGroupInfo,
  parseMessageAttachments,
} from "../helpers";
import type { ChatOrMessageInfo, Message, SQLMessage } from "../types";

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
      limit: searchText ? "1000" : "50",
    }),
  );

  if (!rawData) return [];

  const mapped = await hydrateMessages(rawData);
  const messages = deduplicateReplyContext([...mapped].reverse());

  if (!searchText) return messages;

  return messages.filter((message) => messageMatchesSearch(message, searchText));
}

export async function hydrateMessages(rawData: SQLMessage[]): Promise<Message[]> {
  const lookupIdentifiers = [...new Set(rawData.flatMap((message) => getLookupIdentifiers(message)))];
  const contacts = await fetchContactsForChatIdentifiers(lookupIdentifiers);
  const contactMap = createContactMap(contacts);

  return rawData.map((message) => {
    const decodedBody = decodeMessageBody(message.body, message.plain_text);
    const decodedReply = decodeMessageBody(message.reply_body, message.reply_plain_text) || null;
    const messageInfo: ChatOrMessageInfo = {
      chat_identifier: message.chat_identifier,
      is_from_me: Boolean(message.is_from_me),
      is_group: Boolean(message.is_group),
      display_name: message.group_name,
      group_participants: message.group_participants,
    };

    const { displayName } = getContactOrGroupInfo(messageInfo, contactMap);

    return {
      ...message,
      body: decodedBody,
      sender: message.chat_identifier,
      senderName: displayName,
      is_from_me: Boolean(message.is_from_me),
      is_audio_message: Boolean(message.is_audio_message),
      is_sent: Boolean(message.is_sent),
      is_read: message.is_sent ? true : Boolean(message.is_read),
      attachments: parseMessageAttachments(message.attachments_json),
      replyingTo: decodedReply || null,
    };
  });
}

export function deduplicateReplyContext(messages: Message[]): Message[] {
  let prevReply: string | null = null;
  return messages.map((message) => {
    const originalReply = message.replyingTo ?? null;
    const replyingTo = originalReply && originalReply === prevReply ? null : message.replyingTo;
    prevReply = originalReply;
    return { ...message, replyingTo };
  });
}

export function messageMatchesSearch(message: Message, searchText: string): boolean {
  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  const searchableText = [
    message.body,
    message.senderName,
    message.sender,
    message.is_from_me ? "me" : "",
    message.is_read ? "read" : "unread",
    message.is_audio_message ? "audio" : "",
    message.attachment_mime_type?.split("/"),
    ...message.attachments.flatMap((attachment) => [attachment.name, attachment.mimeType]),
  ]
    .join(" ")
    .toLowerCase();

  return fuzzySearch(searchableText, searchTerms);
}

function getLookupIdentifiers(message: SQLMessage): string[] {
  if (message.is_group && message.group_participants) {
    return message.group_participants
      .split(",")
      .map((participant) => participant.trim())
      .filter(Boolean);
  }

  return [message.chat_identifier];
}
