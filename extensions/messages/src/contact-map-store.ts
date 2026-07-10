import { Cache } from "@raycast/api";

import type { SQLChat } from "./chat-query";
import {
  emptyPersistedContactMap,
  mergeOpenChatCacheIntoPersisted,
  parsePersistedContactMap,
  serializePersistedContactMap,
  type PersistedContactEntry,
  type PersistedContactMap,
  type PersistedContactPhotoEntry,
} from "./contact-map-persist";
import type { Contact } from "./helpers";
import {
  chatCatalogToPersisted,
  emptyPersistedChatCatalog,
  parsePersistedChatCatalog,
  serializePersistedChatCatalog,
  type ChatCatalogPrefs,
  type PersistedChatCatalog,
} from "./open-chat-catalog-persist";

export const CHAT_CATALOG_CACHE_KEY = "open-chat-catalog-v1";
export const CONTACT_MAP_CACHE_KEY = "contact-name-map-v1";
export const CONTACT_MAP_CACHE_NAMESPACE = "open-chat";
export const CONTACT_MAP_PERSIST_DEBOUNCE_MS = 400;
// Contact photos are stored once per contactId; 50MB keeps a warm catalog practical.
export const CONTACT_MAP_CACHE_CAPACITY = 50 * 1024 * 1024;

export type { PersistedContactEntry, PersistedContactMap, PersistedContactPhotoEntry };
export {
  contactFromPersistedEntry,
  contactMapToPersisted,
  contactPhotoCacheToPersisted,
  emptyPersistedContactMap,
  mergeContactMapIntoPersisted,
  mergeContactPhotoCacheIntoPersisted,
  mergeOpenChatCacheIntoPersisted,
  mergePersistedContactMaps,
  parsePersistedContactMap,
  persistedToContactMap,
  persistedToContactPhotoCache,
} from "./contact-map-persist";

export type { PersistedChatCatalog, PersistedChatRow, ChatCatalogPrefs } from "./open-chat-catalog-persist";
export {
  chatCatalogMatchesPrefs,
  chatCatalogToPersisted,
  emptyPersistedChatCatalog,
  parsePersistedChatCatalog,
  persistedChatCatalogToSQLChats,
  serializePersistedChatCatalog,
} from "./open-chat-catalog-persist";

export function loadPersistedChatCatalog(cache: Cache): PersistedChatCatalog {
  const raw = cache.get(CHAT_CATALOG_CACHE_KEY);
  return parsePersistedChatCatalog(raw) ?? emptyPersistedChatCatalog();
}

export function savePersistedChatCatalog(
  cache: Cache,
  chats: readonly SQLChat[],
  prefs: ChatCatalogPrefs,
): PersistedChatCatalog {
  const persisted = chatCatalogToPersisted(chats, prefs);
  cache.set(CHAT_CATALOG_CACHE_KEY, serializePersistedChatCatalog(persisted));
  return persisted;
}

export function createDebouncedChatCatalogPersist(
  cache: Cache,
  debounceMs = CONTACT_MAP_PERSIST_DEBOUNCE_MS,
): (chats: readonly SQLChat[], prefs: ChatCatalogPrefs) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return (chats: readonly SQLChat[], prefs: ChatCatalogPrefs) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      savePersistedChatCatalog(cache, chats, prefs);
      timeout = undefined;
    }, debounceMs);
  };
}

export function createOpenChatCacheStore(): Cache {
  return new Cache({
    namespace: CONTACT_MAP_CACHE_NAMESPACE,
    capacity: CONTACT_MAP_CACHE_CAPACITY,
  });
}

export function loadPersistedContactMap(cache: Cache): PersistedContactMap {
  const raw = cache.get(CONTACT_MAP_CACHE_KEY);
  return parsePersistedContactMap(raw) ?? emptyPersistedContactMap();
}

export function saveOpenChatCache(
  cache: Cache,
  contactMap: Map<string, Contact>,
  contactPhotoCache: Map<string, string | null>,
): PersistedContactMap {
  const existing = loadPersistedContactMap(cache);
  const merged = mergeOpenChatCacheIntoPersisted(existing, contactMap, contactPhotoCache);
  cache.set(CONTACT_MAP_CACHE_KEY, serializePersistedContactMap(merged));
  return merged;
}

export function createDebouncedOpenChatCachePersist(
  cache: Cache,
  debounceMs = CONTACT_MAP_PERSIST_DEBOUNCE_MS,
): (contactMap: Map<string, Contact>, contactPhotoCache: Map<string, string | null>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return (contactMap: Map<string, Contact>, contactPhotoCache: Map<string, string | null>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      saveOpenChatCache(cache, contactMap, contactPhotoCache);
      timeout = undefined;
    }, debounceMs);
  };
}

/** @deprecated Use createDebouncedOpenChatCachePersist */
export function createDebouncedContactMapPersist(
  cache: Cache,
  debounceMs = CONTACT_MAP_PERSIST_DEBOUNCE_MS,
): (contactMap: Map<string, Contact>, contactPhotoCache?: Map<string, string | null>) => void {
  const persist = createDebouncedOpenChatCachePersist(cache, debounceMs);
  return (contactMap, contactPhotoCache = new Map()) => persist(contactMap, contactPhotoCache);
}

/** @deprecated Use saveOpenChatCache */
export function savePersistedContactMap(cache: Cache, contactMap: Map<string, Contact>): PersistedContactMap {
  return saveOpenChatCache(cache, contactMap, new Map());
}
