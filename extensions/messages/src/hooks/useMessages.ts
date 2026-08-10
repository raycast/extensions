import { homedir } from "os";
import { resolve } from "path";

import { getPreferenceValues } from "@raycast/api";
import { usePromise, useSQL } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchContactPhotosForContactIds, fetchContactsForChatIdentifiers } from "swift:../../swift/contacts";

import { MessageFilterStatus } from "../constants";
import { createContactMap, mergeContactMaps, mergeContactPhotos, persistedToContactMap } from "../contact-map-persist";
import { createDebouncedContactMapPersist, createMessagesCache, loadPersistedContactMap } from "../messages-cache";
import {
  buildMessagesQuery,
  decodeHexString,
  fuzzySearch,
  getContactLookupIdentifiers,
  getContactOrGroupInfo,
} from "../helpers";
import type { ChatOrMessageInfo, Contact, Filter, Message, SQLMessage } from "../types";

export type { Message, SQLMessage };
const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export function useMessages(searchText?: string, filter?: Filter) {
  const cacheRef = useRef<ReturnType<typeof createMessagesCache> | undefined>(undefined);
  const persistedRef = useRef<ReturnType<typeof loadPersistedContactMap> | undefined>(undefined);
  const persistRef = useRef<ReturnType<typeof createDebouncedContactMapPersist> | undefined>(undefined);
  if (!cacheRef.current) {
    cacheRef.current = createMessagesCache();
    persistedRef.current = loadPersistedContactMap(cacheRef.current);
    persistRef.current = createDebouncedContactMapPersist(cacheRef.current);
  }
  const [contactMap, setContactMap] = useState(() => persistedToContactMap(persistedRef.current!));
  useEffect(() => () => persistRef.current!.flush(), []);

  const { filterSpam = false, filterUnknownSenders = false, loadContactPhotos = true } = getPreferenceValues();
  const filterClause =
    filter === "unread"
      ? "AND message.is_read = 0 AND message.is_from_me = 0"
      : filter === "contacts"
        ? "AND (chat.is_filtered IS NULL OR chat.is_filtered = 0)"
        : filter === "read"
          ? "AND (message.is_read = 1 OR message.is_from_me = 1)"
          : filter === "me"
            ? "AND message.is_from_me = 1"
            : filter === "audio"
              ? "AND message.is_audio_message = 1"
              : filter === "attachments"
                ? "AND attachment.filename IS NOT NULL AND attachment.filename NOT LIKE '%.pluginPayloadAttachment'"
                : "";
  const query = useMemo(() => {
    const filters = [
      filterSpam ? `(chat.is_filtered IS NULL OR chat.is_filtered != ${MessageFilterStatus.SPAM})` : "",
      filterUnknownSenders
        ? `(chat.is_filtered IS NULL OR chat.is_filtered != ${MessageFilterStatus.UNKNOWN_SENDER})`
        : "",
    ].filter(Boolean);
    return buildMessagesQuery({
      filterClause,
      spamFilters: filters.length ? `AND (${filters.join(" AND ")})` : "",
      limit: "1000",
    });
  }, [filterClause, filterSpam, filterUnknownSenders]);

  const {
    data: rawData,
    isLoading: isLoadingMessages,
    permissionView,
    ...rest
  } = useSQL<SQLMessage>(DB_PATH, query, { permissionPriming: "This is required to read your messages." });
  const messageInfos = useMemo(
    () =>
      rawData?.map((message) => {
        const info: ChatOrMessageInfo = {
          chat_identifier: message.chat_identifier,
          is_from_me: Boolean(message.is_from_me),
          is_group: Boolean(message.is_group),
          display_name: message.group_name,
          group_participants: message.group_participants,
        };
        return {
          message,
          info,
          body: decodeHexString(message.body),
          replyingTo: message.reply_body ? decodeHexString(message.reply_body) : null,
        };
      }),
    [rawData],
  );
  const identifiers = useMemo(
    () => [...new Set(messageInfos?.flatMap(({ info }) => getContactLookupIdentifiers(info)) ?? [])],
    [messageInfos],
  );
  const { data: contacts } = usePromise(
    async (ids) => {
      const found = (await fetchContactsForChatIdentifiers(ids as string[])) as Contact[];
      setContactMap((current) => {
        const merged = mergeContactMaps(current, createContactMap(found));
        persistRef.current!(merged);
        return merged;
      });
      return found;
    },
    [identifiers],
    { execute: Boolean(messageInfos && identifiers.length) },
  );
  const contactIds = useMemo(() => [...new Set((contacts ?? []).map(({ id }) => id))], [contacts]);
  usePromise(
    async (ids) => {
      const photos = await fetchContactPhotosForContactIds(ids as string[]);
      setContactMap((current) => {
        const merged = mergeContactPhotos(current, photos);
        persistRef.current!(merged);
        return merged;
      });
      return photos;
    },
    [contactIds],
    { execute: Boolean(loadContactPhotos && contactIds.length) },
  );

  const terms = searchText?.toLowerCase().split(/\s+/).filter(Boolean);
  const data = messageInfos
    ?.map(({ message, info, body, replyingTo }): Message => {
      const { avatar, displayName } = getContactOrGroupInfo(info, contactMap, loadContactPhotos);
      return {
        ...message,
        body,
        replyingTo,
        sender: message.chat_identifier,
        senderName: displayName,
        avatar,
        is_from_me: Boolean(message.is_from_me),
        is_audio_message: Boolean(message.is_audio_message),
        is_sent: Boolean(message.is_sent),
        is_read: message.is_sent ? true : Boolean(message.is_read),
      };
    })
    .filter((message) => {
      if (!terms?.length) return true;
      const searchable = [
        message.body,
        message.senderName,
        message.sender,
        message.is_from_me ? "me" : "",
        message.is_read ? "read" : "unread",
        message.is_audio_message ? "audio" : "",
        message.attachment_mime_type?.split("/"),
      ]
        .join(" ")
        .toLowerCase();
      return fuzzySearch(searchable, terms);
    })
    .slice(0, 50);

  return {
    data,
    isLoading: isLoadingMessages,
    permissionView,
    ...rest,
  };
}
