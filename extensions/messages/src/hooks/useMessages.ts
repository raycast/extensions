import { homedir } from "os";
import { resolve } from "path";

import { getPreferenceValues } from "@raycast/api";
import { useSQL, usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { fetchContactsForChatIdentifiers } from "swift:../../swift/contacts";

import { MessageFilterStatus } from "../constants";
import {
  createDebouncedOpenChatCachePersist,
  createOpenChatCacheStore,
  loadPersistedContactMap,
  persistedToContactMap,
} from "../contact-map-store";
import {
  buildMessagesQuery,
  createContactMap,
  decodeHexString,
  fuzzySearch,
  getContactLookupIdentifiers,
  getContactOrGroupInfo,
  type Contact,
} from "../helpers";
import { Filter, SQLMessage, Message, ChatOrMessageInfo } from "../types";

export type { SQLMessage, Message };

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

function mergeContactMaps(base: Map<string, Contact>, incoming: Map<string, Contact>): Map<string, Contact> {
  if (incoming.size === 0) {
    return base;
  }

  const next = new Map(base);
  incoming.forEach((contact, identifier) => {
    next.set(identifier, contact);
  });
  return next;
}

function hydrateMessage(
  message: SQLMessage,
  decodedBody: string,
  info: ChatOrMessageInfo,
  contactMap: Map<string, Contact>,
  replyingTo: string | null,
): Message {
  const { avatar, displayName } = getContactOrGroupInfo(info, contactMap);

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
}

export function useMessages(searchText?: string, filter?: Filter) {
  const preferences = getPreferenceValues();
  const filterSpam = preferences.filterSpam ?? false;
  const filterUnknownSenders = preferences.filterUnknownSenders ?? false;

  const contactMapStoreRef = useRef(createOpenChatCacheStore());
  const initialPersistedMapRef = useRef(loadPersistedContactMap(contactMapStoreRef.current));
  const persistOpenChatCacheRef = useRef(createDebouncedOpenChatCachePersist(contactMapStoreRef.current));
  const [contactMapCache, setContactMapCache] = useState<Map<string, Contact>>(() =>
    persistedToContactMap(initialPersistedMapRef.current),
  );

  const filterClause = (() => {
    switch (filter) {
      case "unread":
        return "AND message.is_read = 0 AND message.is_from_me = 0";
      case "contacts":
        return "AND (chat.is_filtered IS NULL OR chat.is_filtered = 0)";
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

  const query = useMemo(() => {
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
      limit: "1000",
    });
  }, [filterClause, filterSpam, filterUnknownSenders]);

  const {
    data: rawData,
    isLoading: isLoadingMessages,
    permissionView,
    ...rest
  } = useSQL<SQLMessage>(DB_PATH, query, {
    permissionPriming: "This is required to read your messages.",
  });

  const messageInfos = useMemo(() => {
    if (!rawData) {
      return undefined;
    }

    return rawData.map((message) => {
      const decodedBody = decodeHexString(message.body);
      const decodedReply = message.reply_body ? decodeHexString(message.reply_body) : null;
      const info: ChatOrMessageInfo = {
        chat_identifier: message.chat_identifier,
        is_from_me: Boolean(message.is_from_me),
        is_group: Boolean(message.is_group),
        display_name: message.group_name,
        group_participants: message.group_participants,
      };

      return { message, decodedBody, info, replyingTo: decodedReply || null };
    });
  }, [rawData]);

  const lookupIdentifiers = useMemo(() => {
    if (!messageInfos) {
      return [];
    }

    return [...new Set(messageInfos.flatMap(({ info }) => getContactLookupIdentifiers(info)))];
  }, [messageInfos]);

  const progressiveData = useMemo(() => {
    if (!messageInfos) {
      return undefined;
    }

    return messageInfos.map(({ message, decodedBody, info, replyingTo }) =>
      hydrateMessage(message, decodedBody, info, contactMapCache, replyingTo),
    );
  }, [contactMapCache, messageInfos]);

  const { isLoading: isLoadingContacts } = usePromise(
    async (identifiers) => {
      const lookupIds = identifiers as string[];
      if (lookupIds.length === 0) {
        return [] as Contact[];
      }

      const contacts = await fetchContactsForChatIdentifiers(
        lookupIds,
        false,
        process.env.MESSAGES_CONTACT_MATCH_STRATEGY ?? "predicate-concurrent",
      );
      const nextMap = createContactMap(contacts);

      setContactMapCache((current) => {
        const merged = mergeContactMaps(current, nextMap);
        persistOpenChatCacheRef.current(merged, new Map());
        return merged;
      });

      return contacts;
    },
    [lookupIdentifiers],
    { execute: !!messageInfos && lookupIdentifiers.length > 0 },
  );

  const searchTerms = searchText
    ?.toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  const filteredData = progressiveData
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

  // SQL still gates first paint; Contacts refresh must not blank the list.
  const isLoading = isLoadingMessages || (!progressiveData && isLoadingContacts);

  return {
    data: filteredData,
    isLoading,
    permissionView,
    ...rest,
  };
}
