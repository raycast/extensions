import { homedir } from "os";
import { resolve } from "path";

import { getPreferenceValues } from "@raycast/api";
import { usePromise, useSQL } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchContactsForChatIdentifiers } from "swift:../../swift/contacts";

import { collapseChatRows } from "../chat-collapse";
import { buildChatQuery } from "../chat-query";
import type { SQLChat } from "../chat-query";
import {
  chatCatalogMatchesPrefs,
  createDebouncedOpenChatCachePersist,
  createOpenChatCacheStore,
  loadPersistedChatCatalog,
  loadPersistedContactMap,
  persistedChatCatalogToSQLChats,
  persistedToContactMap,
  savePersistedChatCatalog,
} from "../contact-map-store";
import { createContactMap, type Contact } from "../helpers";
import {
  hydrateChat,
  isIdentifierLookedUp,
  lookupIdentifiersForChats,
  markIdentifiersLookedUp,
  mergeContactMaps,
  selectVisibleChats,
  toFallbackChat,
  VISIBLE_CHAT_LIMIT,
} from "../open-chat-list";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

export type { ChatParticipant, SQLChat } from "../chat-query";
export type { Chat } from "../open-chat-list";

type UseChatsOptions = {
  showFallbackWhileHydrating?: boolean;
  staleWhileRevalidate?: boolean;
  matchStrategy?: string;
};

export function useChats(searchText: string = "", options: UseChatsOptions = {}) {
  const contactMapStoreRef = useRef(createOpenChatCacheStore());
  const initialPersistedMapRef = useRef(loadPersistedContactMap(contactMapStoreRef.current));
  const initialPersistedCatalogRef = useRef(loadPersistedChatCatalog(contactMapStoreRef.current));
  const persistOpenChatCacheRef = useRef(createDebouncedOpenChatCachePersist(contactMapStoreRef.current));
  const contactMapCacheRef = useRef<Map<string, Contact>>(new Map());

  const [contactMapCache, setContactMapCache] = useState<Map<string, Contact>>(() =>
    persistedToContactMap(initialPersistedMapRef.current),
  );
  const [lookedUpIdentifiers, setLookedUpIdentifiers] = useState<Set<string>>(() =>
    markIdentifiersLookedUp(new Set(), Object.keys(initialPersistedMapRef.current.byIdentifier)),
  );
  const [sessionVisibleRefreshed, setSessionVisibleRefreshed] = useState<Set<string>>(() => new Set());

  const preferences = getPreferenceValues();
  const filterSpam = preferences.filterSpam ?? false;
  const filterUnknownSenders = preferences.filterUnknownSenders ?? false;
  const showFallbackWhileHydrating = options.showFallbackWhileHydrating ?? true;
  const staleWhileRevalidate = options.staleWhileRevalidate ?? true;
  const matchStrategy = options.matchStrategy ?? process.env.MESSAGES_CONTACT_MATCH_STRATEGY ?? "predicate-concurrent";
  const backgroundMatchStrategy = process.env.MESSAGES_CONTACT_BACKGROUND_MATCH_STRATEGY ?? "enumerate-early-exit";

  const schedulePersistOpenChatCache = useCallback((contactMap: Map<string, Contact>) => {
    persistOpenChatCacheRef.current(contactMap, new Map());
  }, []);

  useEffect(() => {
    contactMapCacheRef.current = contactMapCache;
  }, [contactMapCache]);

  const catalogPrefs = useMemo(() => ({ filterSpam, filterUnknownSenders }), [filterSpam, filterUnknownSenders]);

  const staleCatalogChats = useMemo(() => {
    if (!staleWhileRevalidate) {
      return undefined;
    }

    const catalog = initialPersistedCatalogRef.current;
    if (!chatCatalogMatchesPrefs(catalog, catalogPrefs) || catalog.chats.length === 0) {
      return undefined;
    }

    return persistedChatCatalogToSQLChats(catalog);
  }, [catalogPrefs, staleWhileRevalidate]);

  const hasStaleCatalog = Boolean(staleCatalogChats && staleCatalogChats.length > 0);

  const {
    data: rawData,
    isLoading: isLoadingChats,
    permissionView,
    ...rest
  } = useSQL<SQLChat>(
    DB_PATH,
    buildChatQuery({
      filterSpam,
      filterUnknownSenders,
    }),
    {
      permissionPriming: "This is required to read your chats.",
    },
  );

  const freshCanonicalChats = useMemo(() => (rawData ? collapseChatRows(rawData) : undefined), [rawData]);
  const canonicalChats = freshCanonicalChats ?? staleCatalogChats;

  useEffect(() => {
    if (!freshCanonicalChats) {
      return;
    }

    savePersistedChatCatalog(contactMapStoreRef.current, freshCanonicalChats, catalogPrefs);
  }, [catalogPrefs, freshCanonicalChats]);

  const fallbackData = useMemo(() => canonicalChats?.map(toFallbackChat), [canonicalChats]);

  const searchableCatalog = useMemo(() => {
    if (!fallbackData) {
      return undefined;
    }

    if (contactMapCache.size === 0) {
      return fallbackData;
    }

    return fallbackData.map((chat) => hydrateChat(chat, contactMapCache));
  }, [contactMapCache, fallbackData]);

  const visibleCandidates = useMemo(() => {
    if (!searchableCatalog) {
      return undefined;
    }

    return selectVisibleChats(searchableCatalog, searchText);
  }, [searchableCatalog, searchText]);

  const missingLookupIdentifiers = useMemo(() => {
    if (!visibleCandidates) {
      return [];
    }

    return lookupIdentifiersForChats(visibleCandidates).filter(
      (identifier) => !isIdentifierLookedUp(sessionVisibleRefreshed, identifier),
    );
  }, [sessionVisibleRefreshed, visibleCandidates]);

  const mergeContacts = useCallback(
    (lookupIdentifiers: string[], contacts: Contact[], markVisibleRefresh: boolean) => {
      const nextMap = createContactMap(contacts);
      setContactMapCache((current) => {
        const merged = mergeContactMaps(current, nextMap);
        schedulePersistOpenChatCache(merged);
        return merged;
      });

      if (markVisibleRefresh) {
        setSessionVisibleRefreshed((current) => markIdentifiersLookedUp(current, lookupIdentifiers));
      }
      setLookedUpIdentifiers((current) => markIdentifiersLookedUp(current, lookupIdentifiers));
    },
    [schedulePersistOpenChatCache],
  );

  const { data: visibleContacts, isLoading: isLoadingVisibleContacts } = usePromise(
    async (identifiers, activeMatchStrategy) => {
      const lookupIdentifiers = identifiers as string[];
      if (lookupIdentifiers.length === 0) {
        return [] as Contact[];
      }

      const contacts = await fetchContactsForChatIdentifiers(lookupIdentifiers, false, activeMatchStrategy);
      mergeContacts(lookupIdentifiers, contacts, true);
      return contacts;
    },
    [missingLookupIdentifiers, matchStrategy, mergeContacts],
    { execute: !!visibleCandidates && missingLookupIdentifiers.length > 0 },
  );

  const namesReady = missingLookupIdentifiers.length === 0 || !!visibleContacts;

  const backgroundLookupIdentifiers = useMemo(() => {
    if (!canonicalChats || !namesReady) {
      return [];
    }

    return lookupIdentifiersForChats(canonicalChats).filter(
      (identifier) => !isIdentifierLookedUp(lookedUpIdentifiers, identifier),
    );
  }, [canonicalChats, lookedUpIdentifiers, namesReady]);

  usePromise(
    async (identifiers, activeBackgroundStrategy) => {
      const lookupIdentifiers = identifiers as string[];
      if (lookupIdentifiers.length === 0) {
        return [] as Contact[];
      }

      const contacts = await fetchContactsForChatIdentifiers(lookupIdentifiers, false, activeBackgroundStrategy);
      mergeContacts(lookupIdentifiers, contacts, false);
      return contacts;
    },
    [backgroundLookupIdentifiers, backgroundMatchStrategy, mergeContacts],
    { execute: namesReady && backgroundLookupIdentifiers.length > 0 },
  );

  const hydratedVisibleData = useMemo(() => {
    if (!visibleCandidates) {
      return undefined;
    }

    if (!namesReady && !showFallbackWhileHydrating) {
      return undefined;
    }

    const hydrated = visibleCandidates.map((chat) => hydrateChat(chat, contactMapCache));
    return collapseChatRows(hydrated).slice(0, VISIBLE_CHAT_LIMIT);
  }, [contactMapCache, namesReady, showFallbackWhileHydrating, visibleCandidates]);

  const data = hydratedVisibleData;

  const canShowRows = Boolean(data) && (namesReady || showFallbackWhileHydrating);

  return {
    data: canShowRows ? data : undefined,
    isLoading:
      (!hasStaleCatalog && isLoadingChats) ||
      (!showFallbackWhileHydrating && (!namesReady || isLoadingVisibleContacts)),
    permissionView,
    ...rest,
  };
}
