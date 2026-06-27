import { homedir } from "os";
import { resolve } from "path";

import { Image, getPreferenceValues } from "@raycast/api";
import { useSQL, usePromise } from "@raycast/utils";
import { fetchContactsForPhoneNumbers } from "swift:../../swift/contacts";

import { MessageFilterStatus } from "../constants";
import {
  buildMessagesQuery,
  ChatParticipant,
  decodeHexString,
  fuzzySearch,
  createContactMap,
  getContactOrGroupInfo,
  ChatOrMessageInfo,
} from "../helpers";
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
  reply_body: string | null;
};

export type Message = SQLMessage & {
  avatar?: Image.ImageLike;
  sender: string;
  senderName: string;
  replyingTo?: string | null;
};

export function useMessages(searchText?: string, filter?: Filter) {
  const preferences = getPreferenceValues();
  const filterSpam = preferences.filterSpam ?? false;
  const filterUnknownSenders = preferences.filterUnknownSenders ?? false;
  const loadContactPhotos = preferences.loadContactPhotos ?? true;

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

  const buildQuery = () => {
    const filterConditions: string[] = [];

    if (filterSpam) {
      filterConditions.push(`(chat.is_filtered IS NULL OR chat.is_filtered != ${MessageFilterStatus.SPAM})`);
    }
    if (filterUnknownSenders) {
      filterConditions.push(`(chat.is_filtered IS NULL OR chat.is_filtered != ${MessageFilterStatus.UNKNOWN_SENDER})`);
    }

    const spamFilters = filterConditions.length > 0 ? `AND (${filterConditions.join(" AND ")})` : "";

    return buildMessagesQuery({
      filterClause,
      spamFilters,
      limit: searchText ? "1000" : "50",
    });
  };

  const {
    data: rawData,
    isLoading: isLoadingMessages,
    permissionView,
    ...rest
  } = useSQL<SQLMessage>(DB_PATH, buildQuery(), {
    permissionPriming: "This is required to read your messages.",
  });

  const { data, isLoading: isLoadingContacts } = usePromise(
    async (rawMessages, loadPhotos) => {
      if (!rawMessages) return [];

      const messages = rawMessages as SQLMessage[];

      const uniqueChatIdentifiers = [...new Set(messages.map((m) => m.chat_identifier))];
      const contacts = await fetchContactsForPhoneNumbers(uniqueChatIdentifiers, loadPhotos);
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

        const decodedReply = m.reply_body ? decodeHexString(m.reply_body) : null;

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
          replyingTo: decodedReply || null,
        };
      });
    },
    [rawData, loadContactPhotos],
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
    permissionView,
    ...rest,
  };
}
