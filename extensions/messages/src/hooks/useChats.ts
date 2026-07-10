import { homedir } from "os";
import { resolve } from "path";

import { Image, getPreferenceValues } from "@raycast/api";
import { usePromise, useSQL } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchContactPhotosForContactIds, fetchContactsForChatIdentifiers } from "swift:../../swift/contacts";

import { collapseChatRows } from "../chat-collapse";
import { AvatarKind, ChatPhotoMode, selectPhotoContactIds } from "../chat-photo-hydration";
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
  persistedToContactPhotoCache,
  savePersistedChatCatalog,
} from "../contact-map-store";
import {
  buildChatSearchableText,
  fuzzySearch,
  createContactMap,
  getContactLookupIdentifiers,
  getContactOrGroupInfo,
  ChatOrMessageInfo,
  Contact,
} from "../helpers";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");
const VISIBLE_CHAT_LIMIT = 50;

export type { ChatParticipant, SQLChat } from "../chat-query";

export type Chat = Omit<SQLChat, "is_group"> & {
  is_group: boolean;
  avatar?: Image.ImageLike;
  avatarKind?: AvatarKind;
  contactId?: string;
  displayName: string;
  phoneNumber?: string;
  searchableText?: string;
};

type UseChatsOptions = {
  loadContactPhotos?: boolean;
  photoMode?: ChatPhotoMode;
  showFallbackWhileHydrating?: boolean;
  staleWhileRevalidate?: boolean;
  matchStrategy?: string;
};

function chatInfo(chat: SQLChat | Chat): ChatOrMessageInfo {
  return {
    chat_identifier: chat.chat_identifier,
    is_group: Boolean(chat.is_group),
    display_name: chat.display_name,
    group_participants: chat.group_participants,
    group_photo_path: chat.group_photo_path,
  };
}

function toFallbackChat(chat: SQLChat): Chat {
  const info = chatInfo(chat);
  const { avatar, avatarKind, displayName } = getContactOrGroupInfo(info, new Map());

  return {
    ...chat,
    avatar,
    avatarKind,
    displayName,
    is_group: Boolean(chat.is_group),
    searchableText: buildChatSearchableText(chat, displayName),
  };
}

function hydrateChat(chat: SQLChat | Chat, contactMap: Map<string, Contact>): Chat {
  const info = chatInfo(chat);
  const { avatar, avatarKind, contactId, displayName, phoneNumber } = getContactOrGroupInfo(info, contactMap);

  return {
    ...chat,
    avatar,
    avatarKind,
    contactId,
    displayName,
    phoneNumber,
    is_group: Boolean(chat.is_group),
    searchableText: buildChatSearchableText(chat, displayName),
  };
}

function hydrateChatWithPhotos(
  chat: SQLChat | Chat,
  contactMap: Map<string, Contact>,
  contactPhotoMap: Map<string, string | null>,
): Chat {
  return applyContactPhotos(hydrateChat(chat, contactMap), contactPhotoMap);
}

function selectVisibleChats(chats: Chat[], searchText: string): Chat[] {
  const searchTerms = searchText
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  if (searchTerms.length === 0) {
    return chats.slice(0, VISIBLE_CHAT_LIMIT);
  }

  const matches: Chat[] = [];
  for (const chat of chats) {
    if (matches.length >= VISIBLE_CHAT_LIMIT) {
      break;
    }

    if (fuzzySearch(chat.searchableText ?? buildChatSearchableText(chat, chat.displayName), searchTerms)) {
      matches.push(chat);
    }
  }

  return matches;
}

function lookupIdentifiersForChats(chats: readonly (SQLChat | Chat)[]): string[] {
  return [...new Set(chats.flatMap((chat) => getContactLookupIdentifiers(chatInfo(chat))))];
}

function applyContactPhotos(chat: Chat, contactPhotoMap: Map<string, string | null>): Chat {
  if (!chat.contactId) {
    return chat;
  }

  const imageData = contactPhotoMap.get(chat.contactId);
  if (!imageData) {
    return chat;
  }

  return {
    ...chat,
    avatar: { source: `data:image/png;base64,${imageData}`, mask: Image.Mask.Circle },
    avatarKind: "contact-photo",
  };
}

function mergeContactMaps(base: Map<string, Contact>, incoming: Map<string, Contact>): Map<string, Contact> {
  if (incoming.size === 0) {
    return base;
  }

  const next = new Map(base);
  incoming.forEach((contact, identifier) => {
    const existing = next.get(identifier);
    if (existing?.imageData && !contact.imageData) {
      next.set(identifier, { ...contact, imageData: existing.imageData });
      return;
    }

    next.set(identifier, contact);
  });
  return next;
}

function markIdentifiersLookedUp(current: Set<string>, identifiers: readonly string[]): Set<string> {
  if (identifiers.length === 0) {
    return current;
  }

  const next = new Set(current);
  identifiers.forEach((identifier) => {
    next.add(identifier);
    next.add(identifier.toLowerCase());
  });
  return next;
}

function isIdentifierLookedUp(lookedUp: Set<string>, identifier: string): boolean {
  return lookedUp.has(identifier) || lookedUp.has(identifier.toLowerCase());
}

export function useChats(searchText: string = "", options: UseChatsOptions = {}) {
  const contactMapStoreRef = useRef(createOpenChatCacheStore());
  const initialPersistedMapRef = useRef(loadPersistedContactMap(contactMapStoreRef.current));
  const initialPersistedCatalogRef = useRef(loadPersistedChatCatalog(contactMapStoreRef.current));
  const persistOpenChatCacheRef = useRef(createDebouncedOpenChatCachePersist(contactMapStoreRef.current));
  const contactMapCacheRef = useRef<Map<string, Contact>>(new Map());
  const contactPhotoCacheRef = useRef<Map<string, string | null>>(new Map());
  const [contactMapCache, setContactMapCache] = useState<Map<string, Contact>>(() =>
    persistedToContactMap(initialPersistedMapRef.current),
  );
  // Disk-seeded for background skip; visible rows always refresh once per session so renames land.
  const [lookedUpIdentifiers, setLookedUpIdentifiers] = useState<Set<string>>(() =>
    markIdentifiersLookedUp(new Set(), Object.keys(initialPersistedMapRef.current.byIdentifier)),
  );
  const [sessionVisibleRefreshed, setSessionVisibleRefreshed] = useState<Set<string>>(() => new Set());
  const [sessionPhotoLookedUp, setSessionPhotoLookedUp] = useState<Set<string>>(() => new Set());
  const [contactPhotoCache, setContactPhotoCache] = useState<Map<string, string | null>>(() =>
    persistedToContactPhotoCache(initialPersistedMapRef.current),
  );
  const preferences = getPreferenceValues();
  const filterSpam = preferences.filterSpam ?? false;
  const filterUnknownSenders = preferences.filterUnknownSenders ?? false;
  const preferenceLoadContactPhotos = preferences.loadContactPhotos ?? true;
  const photoMode =
    options.photoMode ?? ((options.loadContactPhotos ?? preferenceLoadContactPhotos) ? "visible" : "off");
  const showFallbackWhileHydrating = options.showFallbackWhileHydrating ?? true;
  const staleWhileRevalidate = options.staleWhileRevalidate ?? true;
  // Small visible sets are ideal for indexed phone/email predicates.
  const matchStrategy = options.matchStrategy ?? process.env.MESSAGES_CONTACT_MATCH_STRATEGY ?? "predicate-concurrent";
  // Full-catalog background pass: one store walk with early exit beats thousands of predicates.
  const backgroundMatchStrategy = process.env.MESSAGES_CONTACT_BACKGROUND_MATCH_STRATEGY ?? "enumerate-early-exit";

  const schedulePersistOpenChatCache = useCallback(
    (contactMap: Map<string, Contact>, contactPhotos: Map<string, string | null>) => {
      persistOpenChatCacheRef.current(contactMap, contactPhotos);
    },
    [],
  );

  useEffect(() => {
    contactMapCacheRef.current = contactMapCache;
  }, [contactMapCache]);

  useEffect(() => {
    contactPhotoCacheRef.current = contactPhotoCache;
  }, [contactPhotoCache]);

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

  const fallbackData = useMemo(() => {
    if (!canonicalChats) {
      return undefined;
    }

    return canonicalChats.map(toFallbackChat);
  }, [canonicalChats]);

  const searchableCatalog = useMemo(() => {
    if (!fallbackData) {
      return undefined;
    }

    // Prefer already-resolved names/photos from cache when searching.
    if (contactMapCache.size === 0) {
      return fallbackData;
    }

    return fallbackData.map((chat) => hydrateChatWithPhotos(chat, contactMapCache, contactPhotoCache));
  }, [contactMapCache, contactPhotoCache, fallbackData]);

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

  const { data: visibleContacts, isLoading: isLoadingVisibleContacts } = usePromise(
    async (identifiers, activeMatchStrategy) => {
      const lookupIdentifiers = identifiers as string[];
      if (lookupIdentifiers.length === 0) {
        return [] as Contact[];
      }

      const contacts = await fetchContactsForChatIdentifiers(lookupIdentifiers, false, activeMatchStrategy);
      const nextMap = createContactMap(contacts);
      setContactMapCache((current) => {
        const merged = mergeContactMaps(current, nextMap);
        schedulePersistOpenChatCache(merged, contactPhotoCacheRef.current);
        return merged;
      });
      setSessionVisibleRefreshed((current) => markIdentifiersLookedUp(current, lookupIdentifiers));
      setLookedUpIdentifiers((current) => markIdentifiersLookedUp(current, lookupIdentifiers));

      return contacts;
    },
    [missingLookupIdentifiers, matchStrategy],
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

  const { data: backgroundContacts } = usePromise(
    async (identifiers, activeBackgroundStrategy) => {
      const lookupIdentifiers = identifiers as string[];
      if (lookupIdentifiers.length === 0) {
        return [] as Contact[];
      }

      const contacts = await fetchContactsForChatIdentifiers(lookupIdentifiers, false, activeBackgroundStrategy);
      const nextMap = createContactMap(contacts);
      setContactMapCache((current) => {
        const merged = mergeContactMaps(current, nextMap);
        schedulePersistOpenChatCache(merged, contactPhotoCacheRef.current);
        return merged;
      });
      setLookedUpIdentifiers((current) => markIdentifiersLookedUp(current, lookupIdentifiers));

      return contacts;
    },
    [backgroundLookupIdentifiers, backgroundMatchStrategy],
    { execute: namesReady && backgroundLookupIdentifiers.length > 0 },
  );

  const backgroundNamesReady = backgroundLookupIdentifiers.length === 0 || !!backgroundContacts;

  const hydratedVisibleData = useMemo(() => {
    if (!visibleCandidates) {
      return undefined;
    }

    if (!namesReady && !showFallbackWhileHydrating) {
      return undefined;
    }

    const hydrated = visibleCandidates.map((chat) => hydrateChatWithPhotos(chat, contactMapCache, contactPhotoCache));
    return collapseChatRows(hydrated).slice(0, VISIBLE_CHAT_LIMIT);
  }, [contactMapCache, contactPhotoCache, namesReady, showFallbackWhileHydrating, visibleCandidates]);

  const photoContactIds = useMemo(
    () =>
      selectPhotoContactIds(
        hydratedVisibleData ?? [],
        hydratedVisibleData ?? [],
        photoMode === "off" ? "off" : "visible",
      ),
    [hydratedVisibleData, photoMode],
  );

  const catalogPhotoContactIds = useMemo(() => {
    if (photoMode === "off" || !canonicalChats) {
      return [];
    }

    const hydratedCatalog = canonicalChats.map((chat) =>
      hydrateChatWithPhotos(chat, contactMapCache, contactPhotoCache),
    );
    return selectPhotoContactIds(hydratedCatalog, hydratedCatalog, "all");
  }, [canonicalChats, contactMapCache, contactPhotoCache, photoMode]);

  // Visible photos refresh once per session so cache can update on open.
  const missingVisiblePhotoContactIds = useMemo(
    () => photoContactIds.filter((contactId) => !sessionPhotoLookedUp.has(contactId)),
    [photoContactIds, sessionPhotoLookedUp],
  );

  // Background/catalog refresh also once per session, including already-cached IDs.
  const missingBackgroundPhotoContactIds = useMemo(
    () => catalogPhotoContactIds.filter((contactId) => !sessionPhotoLookedUp.has(contactId)),
    [catalogPhotoContactIds, sessionPhotoLookedUp],
  );

  const mergeFetchedPhotos = useCallback(
    (ids: readonly string[], photos: { id: string; imageData: string | null }[]) => {
      setContactPhotoCache((currentCache) => {
        const nextCache = new Map(currentCache);
        photos.forEach((photo) => {
          if (photo.imageData) {
            nextCache.set(photo.id, photo.imageData);
          }
        });
        schedulePersistOpenChatCache(contactMapCacheRef.current, nextCache);
        return nextCache;
      });
      setSessionPhotoLookedUp((current) => {
        const next = new Set(current);
        ids.forEach((contactId) => next.add(contactId));
        return next;
      });
    },
    [schedulePersistOpenChatCache],
  );

  const { data: contactPhotos } = usePromise(
    async (contactIds) => {
      const ids = contactIds as string[];
      const photos = await fetchContactPhotosForContactIds(ids);
      mergeFetchedPhotos(ids, photos);
      return photos;
    },
    [missingVisiblePhotoContactIds],
    { execute: namesReady && missingVisiblePhotoContactIds.length > 0 },
  );

  const photosReady = missingVisiblePhotoContactIds.length === 0 || !!contactPhotos;

  usePromise(
    async (contactIds) => {
      const ids = contactIds as string[];
      if (ids.length === 0) {
        return [];
      }

      const photos = await fetchContactPhotosForContactIds(ids);
      mergeFetchedPhotos(ids, photos);
      return photos;
    },
    [missingBackgroundPhotoContactIds],
    {
      execute:
        photoMode !== "off" &&
        namesReady &&
        backgroundNamesReady &&
        photosReady &&
        missingBackgroundPhotoContactIds.length > 0 &&
        missingVisiblePhotoContactIds.length === 0,
    },
  );

  // Photos are already applied during hydrate so cached avatars paint immediately.
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
