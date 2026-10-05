import { homedir } from "os";
import { resolve } from "path";

import { getPreferenceValues } from "@raycast/api";
import { usePromise, useSQL } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAllContacts,
  fetchContactPhotosForContactIds,
  fetchContactsForChatIdentifiers,
} from "swift:../../swift/contacts";

import { collapseChatRows } from "../chat-collapse";
import { buildChatQuery, type SQLChat } from "../chat-query";
import { emptyPersistedContactCatalog, persistedCatalogToContacts } from "../contact-catalog-persist";
import { createContactMap, mergeContactMaps, mergeContactPhotos, persistedToContactMap } from "../contact-map-persist";
import {
  chatCatalogMatchesPrefs,
  emptyPersistedChatCatalog,
  persistedChatCatalogToSQLChats,
} from "../open-chat-catalog-persist";
import {
  clearMessagesCache,
  createDebouncedContactMapPersist,
  createMessagesCache,
  loadPersistedChatCatalog,
  loadPersistedContactCatalog,
  loadPersistedContactMap,
  savePersistedChatCatalog,
  savePersistedContactCatalog,
  type MessagesCacheScope,
} from "../messages-cache";
import { buildChatSearchableText, getContactLookupIdentifiers, getContactOrGroupInfo } from "../helpers";
import { selectOpenChatRows, type Chat } from "../open-chat-list";
import type { ChatOrMessageInfo, Contact } from "../types";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");
const BACKGROUND_BATCH_SIZE = 100;

function chatInfo(chat: SQLChat | Chat): ChatOrMessageInfo {
  return {
    chat_identifier: chat.chat_identifier,
    is_group: Boolean(chat.is_group),
    display_name: chat.display_name,
    group_participants: chat.group_participants,
    group_photo_path: chat.group_photo_path,
  };
}

function hydrateChat(chat: SQLChat | Chat, contactMap: Map<string, Contact>, loadContactPhotos: boolean): Chat {
  const { avatar, contactId, displayName, phoneNumber } = getContactOrGroupInfo(
    chatInfo(chat),
    contactMap,
    loadContactPhotos,
  );
  return {
    ...chat,
    avatar,
    contactId,
    displayName,
    phoneNumber,
    is_group: Boolean(chat.is_group),
    searchableText: buildChatSearchableText(chat, displayName),
  };
}

function markIdentifiersResolved(current: Set<string>, identifiers: readonly string[]): Set<string> {
  const next = new Set(current);
  identifiers.forEach((identifier) => {
    next.add(identifier);
    next.add(identifier.toLowerCase());
  });
  return next;
}

function isIdentifierResolved(resolved: Set<string>, identifier: string): boolean {
  return resolved.has(identifier) || resolved.has(identifier.toLowerCase());
}

function lookupIdentifiers(chats: readonly (SQLChat | Chat)[]): string[] {
  return [...new Set(chats.flatMap((chat) => getContactLookupIdentifiers(chatInfo(chat))))];
}

function photoContactIds(chats: readonly Chat[]): string[] {
  return [
    ...new Set(
      chats
        .filter((chat) => !chat.is_group)
        .map((chat) => chat.contactId)
        .filter(Boolean),
    ),
  ] as string[];
}

export function useChatCache(scope: MessagesCacheScope, searchText: string) {
  const includesRecipientCatalog = scope === "send-message";
  const cacheRef = useRef<ReturnType<typeof createMessagesCache> | undefined>(undefined);
  const initialMapRef = useRef<ReturnType<typeof loadPersistedContactMap> | undefined>(undefined);
  const initialChatCatalogRef = useRef<ReturnType<typeof loadPersistedChatCatalog> | undefined>(undefined);
  const initialContactCatalogRef = useRef<ReturnType<typeof loadPersistedContactCatalog> | undefined>(undefined);
  const persistRef = useRef<ReturnType<typeof createDebouncedContactMapPersist> | undefined>(undefined);
  if (!cacheRef.current) {
    cacheRef.current = createMessagesCache();
    initialMapRef.current = loadPersistedContactMap(cacheRef.current);
    initialChatCatalogRef.current = loadPersistedChatCatalog(cacheRef.current);
    initialContactCatalogRef.current = includesRecipientCatalog
      ? loadPersistedContactCatalog(cacheRef.current)
      : emptyPersistedContactCatalog();
    persistRef.current = createDebouncedContactMapPersist(cacheRef.current);
  }

  const initialContactMap = useMemo(
    () =>
      mergeContactMaps(
        persistedToContactMap(initialMapRef.current!),
        createContactMap(persistedCatalogToContacts(initialContactCatalogRef.current!)),
      ),
    [],
  );
  const [reloadEpoch, setReloadEpoch] = useState(0);
  const reloadEpochRef = useRef(0);
  const [contactCatalog, setContactCatalog] = useState<Contact[]>(() =>
    persistedCatalogToContacts(initialContactCatalogRef.current!),
  );
  const [hasContactCatalogSnapshot, setHasContactCatalogSnapshot] = useState(
    () => initialContactCatalogRef.current!.updatedAtEpochMs > 0,
  );
  const [isRefreshingContactCatalog, setIsRefreshingContactCatalog] = useState(includesRecipientCatalog);
  const [contactMap, setContactMap] = useState(initialContactMap);
  const [resolvedIdentifiers, setResolvedIdentifiers] = useState<Set<string>>(() =>
    markIdentifiersResolved(new Set(), [...initialContactMap.keys()]),
  );
  const [photoAttempts, setPhotoAttempts] = useState<Set<string>>(() => new Set());
  const { filterSpam = false, filterUnknownSenders = false, loadContactPhotos = true } = getPreferenceValues();

  useEffect(() => () => persistRef.current!.flush(), []);

  const mergeContacts = useCallback((contacts: Contact[], identifiers: string[]) => {
    setContactMap((current) => {
      const merged = mergeContactMaps(current, createContactMap(contacts));
      persistRef.current!(merged);
      return merged;
    });
    setResolvedIdentifiers((current) => markIdentifiersResolved(current, identifiers));
  }, []);

  const hardReload = useCallback(() => {
    persistRef.current!.flush();
    clearMessagesCache(cacheRef.current!, scope);
    initialMapRef.current = loadPersistedContactMap(cacheRef.current!);
    initialChatCatalogRef.current = emptyPersistedChatCatalog();
    initialContactCatalogRef.current = emptyPersistedContactCatalog();
    setContactCatalog([]);
    setHasContactCatalogSnapshot(false);
    setContactMap(new Map());
    setResolvedIdentifiers(new Set());
    setPhotoAttempts(new Set());
    setIsRefreshingContactCatalog(includesRecipientCatalog);
    reloadEpochRef.current += 1;
    setReloadEpoch(reloadEpochRef.current);
  }, [includesRecipientCatalog, scope]);

  const catalogPrefs = useMemo(() => ({ filterSpam, filterUnknownSenders }), [filterSpam, filterUnknownSenders]);
  const staleCatalogChats = useMemo(() => {
    const catalog = reloadEpoch ? loadPersistedChatCatalog(cacheRef.current!) : initialChatCatalogRef.current!;
    return chatCatalogMatchesPrefs(catalog, catalogPrefs) && catalog.chats.length
      ? persistedChatCatalogToSQLChats(catalog)
      : undefined;
  }, [catalogPrefs, reloadEpoch]);

  const query = useMemo(
    () => `${buildChatQuery({ filterSpam, filterUnknownSenders })}\n-- reload:${reloadEpoch}`,
    [filterSpam, filterUnknownSenders, reloadEpoch],
  );
  const {
    data: rawData,
    isLoading: isLoadingChats,
    permissionView,
  } = useSQL<SQLChat>(DB_PATH, query, { permissionPriming: "This is required to read your chats." });

  const freshChats = useMemo(() => (rawData ? collapseChatRows(rawData) : undefined), [rawData]);
  const canonicalChats = freshChats ?? staleCatalogChats;
  useEffect(() => {
    if (freshChats) savePersistedChatCatalog(cacheRef.current!, freshChats, catalogPrefs);
  }, [catalogPrefs, freshChats]);

  usePromise(
    async (epoch) => {
      const requestEpoch = epoch as number;
      try {
        const contacts = (await fetchAllContacts()) as Contact[];
        if (requestEpoch !== reloadEpochRef.current) return contacts;

        setContactCatalog(contacts);
        setHasContactCatalogSnapshot(true);
        savePersistedContactCatalog(cacheRef.current!, contacts);
        setContactMap((current) => {
          const merged = mergeContactMaps(current, createContactMap(contacts));
          persistRef.current!(merged);
          return merged;
        });
        setResolvedIdentifiers((current) => markIdentifiersResolved(current, [...createContactMap(contacts).keys()]));
        return contacts;
      } finally {
        if (requestEpoch === reloadEpochRef.current) setIsRefreshingContactCatalog(false);
      }
    },
    [reloadEpoch],
    { execute: includesRecipientCatalog },
  );

  const hydratedCatalog = useMemo(
    () =>
      canonicalChats
        ? (collapseChatRows(canonicalChats.map((chat) => hydrateChat(chat, contactMap, loadContactPhotos))) as Chat[])
        : undefined,
    [canonicalChats, contactMap, loadContactPhotos],
  );
  const visibleCandidates = useMemo(
    () => (hydratedCatalog ? selectOpenChatRows(hydratedCatalog, searchText) : undefined),
    [hydratedCatalog, searchText],
  );
  const visibleIdentifiers = useMemo(
    () =>
      lookupIdentifiers(visibleCandidates ?? []).filter(
        (identifier) => !isIdentifierResolved(resolvedIdentifiers, identifier),
      ),
    [resolvedIdentifiers, visibleCandidates],
  );
  const { data: visibleContacts, isLoading: isLoadingVisibleContacts } = usePromise(
    async (identifiers) => {
      const ids = identifiers as string[];
      const contacts = (await fetchContactsForChatIdentifiers(ids)) as Contact[];
      mergeContacts(contacts, ids);
      return contacts;
    },
    [visibleIdentifiers],
    { execute: Boolean(visibleCandidates && visibleIdentifiers.length) },
  );
  const visibleNamesReady = !visibleIdentifiers.length || Boolean(visibleContacts);

  const backgroundIdentifiers = useMemo(
    () =>
      visibleNamesReady
        ? lookupIdentifiers(canonicalChats ?? [])
            .filter((identifier) => !isIdentifierResolved(resolvedIdentifiers, identifier))
            .slice(0, BACKGROUND_BATCH_SIZE)
        : [],
    [canonicalChats, resolvedIdentifiers, visibleNamesReady],
  );
  const { data: backgroundContacts } = usePromise(
    async (identifiers) => {
      const ids = identifiers as string[];
      const contacts = (await fetchContactsForChatIdentifiers(ids)) as Contact[];
      mergeContacts(contacts, ids);
      return contacts;
    },
    [backgroundIdentifiers],
    { execute: Boolean(backgroundIdentifiers.length) },
  );
  const backgroundNamesReady = !backgroundIdentifiers.length || Boolean(backgroundContacts);

  const visibleChats = visibleCandidates;
  const visiblePhotoIds = useMemo(
    () => (loadContactPhotos ? photoContactIds(visibleChats ?? []).filter((id) => !photoAttempts.has(id)) : []),
    [loadContactPhotos, photoAttempts, visibleChats],
  );
  const backgroundPhotoIds = useMemo(
    () =>
      loadContactPhotos && backgroundNamesReady
        ? photoContactIds(hydratedCatalog ?? [])
            .filter((id) => !photoAttempts.has(id))
            .slice(0, BACKGROUND_BATCH_SIZE)
        : [],
    [backgroundNamesReady, hydratedCatalog, loadContactPhotos, photoAttempts],
  );
  const mergePhotos = useCallback((ids: string[], photos: { id: string; imageData: string | null }[]) => {
    setContactMap((current) => {
      const merged = mergeContactPhotos(current, photos);
      persistRef.current!(merged);
      return merged;
    });
    setPhotoAttempts((current) => new Set([...current, ...ids]));
  }, []);

  const { data: visiblePhotos } = usePromise(
    async (ids) => {
      const contactIds = ids as string[];
      const photos = await fetchContactPhotosForContactIds(contactIds);
      mergePhotos(contactIds, photos);
      return photos;
    },
    [visiblePhotoIds],
    { execute: Boolean(visibleNamesReady && visiblePhotoIds.length) },
  );
  const visiblePhotosReady = !visiblePhotoIds.length || Boolean(visiblePhotos);
  usePromise(
    async (ids) => {
      const contactIds = ids as string[];
      const photos = await fetchContactPhotosForContactIds(contactIds);
      mergePhotos(contactIds, photos);
      return photos;
    },
    [backgroundPhotoIds],
    {
      execute: Boolean(
        visibleNamesReady &&
        backgroundNamesReady &&
        visiblePhotosReady &&
        !visiblePhotoIds.length &&
        backgroundPhotoIds.length,
      ),
    },
  );

  return {
    visibleChats,
    hydratedCatalog,
    contactCatalog,
    contactMap,
    hasResolvedFreshChats: freshChats !== undefined,
    hasContactCatalogSnapshot,
    isRefreshingContactCatalog,
    loadContactPhotos,
    isLoadingChats: !visibleChats && ((!staleCatalogChats && isLoadingChats) || isLoadingVisibleContacts),
    permissionView,
    hardReload,
  };
}
