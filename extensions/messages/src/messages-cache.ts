import { Cache } from "@raycast/api";

import type { SQLChat } from "./chat-query";
import {
  contactsToPersistedCatalog,
  emptyPersistedContactCatalog,
  parsePersistedContactCatalog,
  serializePersistedContactCatalog,
  type PersistedContactCatalog,
} from "./contact-catalog-persist";
import {
  emptyPersistedContactMap,
  mergeOpenChatCacheIntoPersisted,
  parsePersistedContactMap,
  serializePersistedContactMap,
} from "./contact-map-persist";
import type { Contact } from "./types";
import {
  chatCatalogToPersisted,
  emptyPersistedChatCatalog,
  parsePersistedChatCatalog,
  serializePersistedChatCatalog,
  type ChatCatalogPrefs,
  type PersistedChatCatalog,
} from "./open-chat-catalog-persist";

const CONTACT_MAP_PERSIST_DEBOUNCE_MS = 400;
const CHAT_CATALOG_CACHE_KEY = "open-chat-catalog-v1";
const CONTACT_CATALOG_CACHE_KEY = "contact-catalog-v1";
const CONTACT_MAP_CACHE_KEY = "contact-name-map-v1";

export type MessagesCacheScope = "open-chat" | "send-message";

export function createMessagesCache(): Cache {
  return new Cache({ namespace: "open-chat", capacity: 50 * 1024 * 1024 });
}

export function loadPersistedChatCatalog(cache: Cache): PersistedChatCatalog {
  return parsePersistedChatCatalog(cache.get(CHAT_CATALOG_CACHE_KEY)) ?? emptyPersistedChatCatalog();
}

export function savePersistedChatCatalog(cache: Cache, chats: readonly SQLChat[], prefs: ChatCatalogPrefs) {
  cache.set(CHAT_CATALOG_CACHE_KEY, serializePersistedChatCatalog(chatCatalogToPersisted(chats, prefs)));
}

export function loadPersistedContactMap(cache: Cache) {
  return parsePersistedContactMap(cache.get(CONTACT_MAP_CACHE_KEY)) ?? emptyPersistedContactMap();
}

export function loadPersistedContactCatalog(cache: Cache): PersistedContactCatalog {
  return parsePersistedContactCatalog(cache.get(CONTACT_CATALOG_CACHE_KEY)) ?? emptyPersistedContactCatalog();
}

export function savePersistedContactCatalog(cache: Cache, contacts: readonly Contact[]): PersistedContactCatalog {
  const persisted = contactsToPersistedCatalog(contacts);
  cache.set(CONTACT_CATALOG_CACHE_KEY, serializePersistedContactCatalog(persisted));
  return persisted;
}

export function clearMessagesCache(cache: Cache, scope: MessagesCacheScope): void {
  cache.remove(CHAT_CATALOG_CACHE_KEY);
  cache.remove(CONTACT_MAP_CACHE_KEY);
  if (scope === "send-message") cache.remove(CONTACT_CATALOG_CACHE_KEY);
}

function saveContactMap(cache: Cache, contactMap: Map<string, Contact>) {
  const merged = mergeOpenChatCacheIntoPersisted(loadPersistedContactMap(cache), contactMap);
  cache.set(CONTACT_MAP_CACHE_KEY, serializePersistedContactMap(merged));
  return merged;
}

type DebouncedContactMapPersist = {
  (contactMap: Map<string, Contact>): void;
  flush(): void;
};

export function createDebouncedContactMapPersist(
  cache: Cache,
  debounceMs = CONTACT_MAP_PERSIST_DEBOUNCE_MS,
): DebouncedContactMapPersist {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let pending: Map<string, Contact> | undefined;
  const flush = () => {
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
    if (!pending) return;
    saveContactMap(cache, pending);
    pending = undefined;
  };
  const persist = (contactMap: Map<string, Contact>) => {
    pending = contactMap;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(flush, debounceMs);
  };
  persist.flush = flush;
  return persist;
}
