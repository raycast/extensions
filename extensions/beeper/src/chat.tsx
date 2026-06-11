import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  useNavigation,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCachedState, useFrecencySorting, useForm, useLocalStorage, withAccessToken } from "@raycast/utils";
import BeeperDesktop from "@beeper/desktop-api";
import Fuse from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  archiveChat,
  createBeeperOAuth,
  createChatReminder,
  deleteChatReminder,
  focusApp,
  listChatMessages,
  retrieveChat,
  searchChats,
  searchMessages,
  sendMessage,
  updateMessage,
  getRaycastFocusLink,
  useBeeperDesktop,
} from "./api";
import { AccountServiceInfo, useAccountServiceCache } from "./utils/account-service-cache";
import { parseDate, getErrorMessage, getMessageID } from "./utils/helpers";

type InboxFilter = "all" | "inbox" | "primary" | "low-priority" | "archive";
type ChatTypeFilter = "any" | "single" | "group";

interface ChatFilters {
  inbox: InboxFilter;
  type: ChatTypeFilter;
  unreadOnly: boolean;
  includeMuted: boolean;
}

const recentDefaultFilters: ChatFilters = {
  inbox: "primary",
  type: "any",
  unreadOnly: false,
  includeMuted: true,
};

type ChatInbox = "primary" | "low-priority" | "archive";
type IndexedChat = { chat: BeeperDesktop.Chat; inbox: ChatInbox; searchFields: ChatSearchFields };
type ChatIndexState = {
  items: IndexedChat[];
  cursors: Record<ChatInbox, { newestCursor?: string | null; oldestCursor?: string | null }>;
  updatedAt: number;
};

const INDEXED_INBOXES: ChatInbox[] = ["primary", "low-priority", "archive"];
const MAX_INDEXED_CHATS_TARGET = 3000;
const INDEX_PAGE_LIMIT = 50;
const INDEX_MAX_PAGES = 10;
const INDEX_MAX_PAGES_INCREMENTAL = 2;
const INDEX_REFRESH_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_PARTICIPANTS_INDEXED = 10;
const MAX_PARTICIPANTS_STORED = 0;
const MAX_INDEXED_CHATS_PER_INBOX = Math.ceil(MAX_INDEXED_CHATS_TARGET / INDEXED_INBOXES.length);

const emptyCursors: ChatIndexState["cursors"] = {
  primary: { newestCursor: null, oldestCursor: null },
  "low-priority": { newestCursor: null, oldestCursor: null },
  archive: { newestCursor: null, oldestCursor: null },
};

const defaultIndexState: ChatIndexState = {
  items: [],
  cursors: emptyCursors,
  updatedAt: 0,
};

const getChatTimestamp = (chat: BeeperDesktop.Chat) => {
  if (!chat.lastActivity) return 0;
  const ts = Date.parse(chat.lastActivity);
  return Number.isNaN(ts) ? 0 : ts;
};

const getChatServiceLabel = (
  chat: Pick<BeeperDesktop.Chat, "accountID">,
  accountServices?: Map<string, AccountServiceInfo>,
) => accountServices?.get(chat.accountID)?.serviceLabel;

const sortIndexedChatsByActivity = (items: IndexedChat[]) =>
  [...items].sort((a, b) => getChatTimestamp(b.chat) - getChatTimestamp(a.chat));

const sortChatsByActivity = (items: BeeperDesktop.Chat[]) =>
  [...items].sort((a, b) => getChatTimestamp(b) - getChatTimestamp(a));

const mergeIndexedChats = (base: IndexedChat[], updates: IndexedChat[]) => {
  const map = new Map<string, IndexedChat>();
  for (const item of base) {
    map.set(item.chat.id, item);
  }
  for (const item of updates) {
    map.set(item.chat.id, item);
  }
  return Array.from(map.values());
};

const summarizeChatForIndex = (chat: BeeperDesktop.Chat): BeeperDesktop.Chat => ({
  id: chat.id,
  accountID: chat.accountID,
  participants: {
    hasMore: false,
    items: MAX_PARTICIPANTS_STORED > 0 ? (chat.participants?.items ?? []).slice(0, MAX_PARTICIPANTS_STORED) : [],
    total: chat.participants?.total ?? 0,
  },
  type: chat.type,
  unreadCount: chat.unreadCount ?? 0,
  isArchived: chat.isArchived ?? false,
  isMuted: chat.isMuted ?? false,
  isPinned: chat.isPinned ?? false,
  lastActivity: chat.lastActivity ?? undefined,
  lastReadMessageSortKey: chat.lastReadMessageSortKey ?? undefined,
  localChatID: chat.localChatID ?? null,
  title: chat.title ?? "",
});

const normalizeIndexState = (state: ChatIndexState): ChatIndexState => {
  let changed = false;
  let items = state.items;

  // Backfill searchFields for items persisted before this field existed
  const needsBackfill = items.some((item) => !item.searchFields);
  if (needsBackfill) {
    items = items.map((item) =>
      item.searchFields ? item : { ...item, searchFields: { title: "", network: "", participants: [] } },
    );
    changed = true;
  }

  if (items.length > MAX_INDEXED_CHATS_TARGET) {
    items = sortIndexedChatsByActivity(items).slice(0, MAX_INDEXED_CHATS_TARGET);
    changed = true;
  }
  return changed ? { ...state, items } : state;
};

const STOP_WORDS = new Set(["and"]);

const normalizeSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[|!'^=]/g, " ")
    .replace(/[,;!?(){}[\]"'`~#$%^&*+=<>\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseSearchTerms = (query: string) =>
  normalizeSearchValue(query)
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

type ChatSearchFields = {
  title: string;
  network: string;
  participants: string[];
};

interface PropertyScore {
  minScore: number;
  hits: number;
}

interface SearchableScore {
  title: PropertyScore;
  network: PropertyScore;
  participants: PropertyScore;
}

interface SearchIndexResult {
  id: string;
  score: SearchableScore;
  matchSearchTerms: Set<string>;
}

interface SearchIndexItem {
  id: string;
  searchFields: ChatSearchFields;
}

interface SearchableMatch {
  id: string;
  title: number[];
  network: number[];
  participants: number[];
  matchedSearchTerms: Set<string>;
}

const computeScore = (scores: number[]): PropertyScore => {
  if (!scores || scores.length === 0) {
    return { minScore: Number.MAX_SAFE_INTEGER, hits: 0 };
  }
  return { minScore: Math.min(...scores), hits: scores.length };
};

const computeScoreFromMatch = (match: SearchableMatch): SearchableScore => ({
  title: computeScore(match.title),
  network: computeScore(match.network),
  participants: computeScore(match.participants),
});

type SearchProperty = keyof ChatSearchFields;

class ThreadSearchIndex {
  private fuse: Fuse<SearchIndexItem>;

  constructor(collection: SearchIndexItem[]) {
    this.fuse = new Fuse(collection, {
      ignoreDiacritics: true,
      includeScore: true,
      ignoreLocation: true,
      ignoreFieldNorm: true,
      threshold: 0,
      keys: ["searchFields.title", "searchFields.network", "searchFields.participants"],
    });
  }

  search(query: string, properties: SearchProperty[]): SearchIndexResult[] {
    if (!query?.trim()) return [];
    const searchTerms = parseSearchTerms(query);
    const matches = new Map<string, SearchableMatch>();

    const getOrCreateMatch = (id: string): SearchableMatch => {
      const existing = matches.get(id);
      if (existing) return existing;
      const fresh: SearchableMatch = {
        id,
        title: [],
        network: [],
        participants: [],
        matchedSearchTerms: new Set<string>(),
      };
      matches.set(id, fresh);
      return fresh;
    };

    for (const searchTerm of searchTerms) {
      for (const property of properties) {
        const expression = { [`searchFields.${property}`]: searchTerm } as unknown as Parameters<
          Fuse<SearchIndexItem>["search"]
        >[0];
        const results = this.fuse.search(expression);
        for (const result of results) {
          if (result.score == null) continue;
          const match = getOrCreateMatch(result.item.id);
          match[property].push(result.score);
          match.matchedSearchTerms.add(searchTerm);
        }
      }
    }

    const requiredTerms = searchTerms.filter((term) => !STOP_WORDS.has(term));
    const resp: SearchIndexResult[] = [];
    for (const match of matches.values()) {
      if (requiredTerms.length > 0 && !requiredTerms.every((term) => match.matchedSearchTerms.has(term))) {
        continue;
      }
      resp.push({
        id: match.id,
        score: computeScoreFromMatch(match),
        matchSearchTerms: match.matchedSearchTerms,
      });
    }
    return resp;
  }
}

const buildSearchFields = (
  chat: BeeperDesktop.Chat,
  accountServices: Map<string, AccountServiceInfo>,
): ChatSearchFields | null => {
  const title = normalizeSearchValue(chat.title || "");
  const serviceLabel = getChatServiceLabel(chat, accountServices);
  if (!serviceLabel) {
    console.warn(`Account metadata not loaded for ${chat.accountID}, skipping`);
    return null;
  }
  const network = normalizeSearchValue(serviceLabel);
  const participants =
    chat.participants?.items
      ?.slice(0, MAX_PARTICIPANTS_INDEXED)
      .map((participant) => {
        const values = [
          participant.fullName,
          participant.username,
          participant.email,
          participant.phoneNumber ? String(participant.phoneNumber).replace(/\D/g, "") : undefined,
        ]
          .filter(Boolean)
          .map((value) => normalizeSearchValue(String(value)));
        return values.join(" ").trim();
      })
      .filter(Boolean) ?? [];

  return { title, network, participants };
};

type ChatListViewProps = {
  stateKey: string;
  searchPlaceholder: string;
  defaultFilters: ChatFilters;
  showPinnedSection?: boolean;
  showSmartSections?: boolean;
  showUnreadSection?: boolean;
};

export function ChatListView({
  stateKey,
  searchPlaceholder,
  defaultFilters,
  showPinnedSection = true,
  showSmartSections = false,
  showUnreadSection = true,
}: ChatListViewProps) {
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useCachedState<ChatFilters>(`${stateKey}:filters`, defaultFilters);
  const [isShowingDetail, setIsShowingDetail] = useCachedState<boolean>(`${stateKey}:showing-detail`, false);
  const { value: recentChatIDs = [], setValue: setRecentChatIDs } = useLocalStorage<string[]>(
    `${stateKey}:recent-ids`,
    [],
  );
  const { setValue: setLastChatID } = useLocalStorage<string | null>(`${stateKey}:last-id`, null);
  const { value: indexStateRaw = defaultIndexState, setValue: setIndexState } = useLocalStorage<ChatIndexState>(
    `${stateKey}:index:v2`,
    defaultIndexState,
  );

  const trimmedQuery = searchText.trim();
  const normalizedType = (filters.type as string) === "channel" ? "any" : filters.type;
  const indexState = useMemo(() => normalizeIndexState(indexStateRaw ?? defaultIndexState), [indexStateRaw]);
  const indexRef = useRef<ChatIndexState>(indexState);
  const refreshInFlight = useRef(false);
  const initialRefreshDone = useRef(false);
  const [isIndexRefreshing, setIsIndexRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const {
    data: accountServiceInfoList,
    isLoading: isLoadingAccountServices,
    error: accountServicesError,
  } = useAccountServiceCache();
  const accountServices = useMemo(
    () => new Map((accountServiceInfoList ?? []).map((account) => [account.accountID, account])),
    [accountServiceInfoList],
  );

  useEffect(() => {
    indexRef.current = indexState;
  }, [indexState]);

  const fetchInbox = async (
    inbox: ChatInbox,
    mode: "full" | "incremental",
    cursors: ChatIndexState["cursors"][ChatInbox],
    onPage?: (payload: {
      items: IndexedChat[];
      newestCursor?: string | null;
      oldestCursor?: string | null;
      done: boolean;
    }) => void | Promise<void>,
  ) => {
    if (accountServices.size === 0) {
      throw new Error("Account metadata not loaded");
    }

    const maxPages = mode === "incremental" ? INDEX_MAX_PAGES_INCREMENTAL : INDEX_MAX_PAGES;
    const items: IndexedChat[] = [];
    let itemsCount = 0;
    let cursor: string | null | undefined = undefined;
    let newestCursor = cursors?.newestCursor ?? null;
    let oldestCursor = cursors?.oldestCursor ?? null;

    for (let page = 0; page < maxPages; page += 1) {
      const response = await searchChats({
        inbox,
        includeMuted: true,
        type: "any",
        limit: INDEX_PAGE_LIMIT,
        cursor: cursor ?? undefined,
        direction: "before",
      });
      const pageItems = response.items ?? [];
      if (page === 0 && response.newestCursor) {
        newestCursor = response.newestCursor;
      }
      if (response.oldestCursor) {
        oldestCursor = response.oldestCursor;
      }
      if (pageItems.length === 0) break;
      const mapped = pageItems
        .map((chat) => {
          const searchFields = buildSearchFields(chat, accountServices);
          if (!searchFields) return null;
          return { chat: summarizeChatForIndex(chat), inbox, searchFields };
        })
        .filter((item): item is IndexedChat => item !== null);
      itemsCount += mapped.length;
      if (!onPage) {
        items.push(...mapped);
      }

      const reachedLimit = itemsCount >= MAX_INDEXED_CHATS_PER_INBOX;
      const done = reachedLimit || mode === "incremental" || !response.hasMore;
      if (onPage) {
        await onPage({
          items: mapped,
          newestCursor,
          oldestCursor,
          done,
        });
      }

      if (done) break;
      const nextCursor = response.oldestCursor ?? response.nextCursor ?? response.cursor;
      if (!nextCursor) break;
      cursor = nextCursor;
    }

    return { items, newestCursor, oldestCursor };
  };

  const refreshIndex = async (mode: "full" | "incremental" = "incremental") => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsIndexRefreshing(true);
    setError(undefined);

    const base = mode === "full" ? defaultIndexState : (indexRef.current ?? defaultIndexState);
    const nextState: ChatIndexState = {
      items: mode === "full" ? [] : [...base.items],
      cursors: {
        primary: { ...base.cursors.primary },
        "low-priority": { ...base.cursors["low-priority"] },
        archive: { ...base.cursors.archive },
      },
      updatedAt: base.updatedAt,
    };

    try {
      let lastPersist = 0;
      const persistIfNeeded = async (force = false) => {
        const now = Date.now();
        if (!force && now - lastPersist < 250) return;
        lastPersist = now;
        await setIndexState({ ...nextState, updatedAt: now });
      };

      for (const inbox of INDEXED_INBOXES) {
        const result = await fetchInbox(inbox, mode, base.cursors[inbox], async (page) => {
          nextState.items = mergeIndexedChats(nextState.items, page.items);
          nextState.cursors[inbox] = {
            newestCursor: page.newestCursor ?? nextState.cursors[inbox].newestCursor ?? null,
            oldestCursor: page.oldestCursor ?? nextState.cursors[inbox].oldestCursor ?? null,
          };
          if (nextState.items.length > MAX_INDEXED_CHATS_TARGET * 2) {
            nextState.items = sortIndexedChatsByActivity(nextState.items).slice(0, MAX_INDEXED_CHATS_TARGET);
          }
          await persistIfNeeded(page.done);
        });
        nextState.cursors[inbox] = {
          newestCursor: result.newestCursor ?? nextState.cursors[inbox].newestCursor ?? null,
          oldestCursor: result.oldestCursor ?? nextState.cursors[inbox].oldestCursor ?? null,
        };
      }

      nextState.items = sortIndexedChatsByActivity(nextState.items).slice(0, MAX_INDEXED_CHATS_TARGET);
      nextState.updatedAt = Date.now();
      await setIndexState(nextState);
    } catch (err) {
      setError(err);
    } finally {
      refreshInFlight.current = false;
      setIsIndexRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialRefreshDone.current) return;
    if (accountServices.size === 0) return;
    initialRefreshDone.current = true;
    const current = indexRef.current;
    const isStale = current.items.length === 0 || Date.now() - current.updatedAt > INDEX_REFRESH_MAX_AGE_MS;
    void refreshIndex(isStale ? "full" : "incremental");
  }, [accountServices]);

  const tokens = useMemo(() => parseSearchTerms(trimmedQuery), [trimmedQuery]);
  const normalizedQuery = useMemo(() => normalizeSearchValue(trimmedQuery), [trimmedQuery]);
  const searchIndex = useMemo(() => {
    if (tokens.length === 0) return null;
    const collection = indexState.items.map((item) => ({ id: item.chat.id, searchFields: item.searchFields }));
    return new ThreadSearchIndex(collection);
  }, [indexState.items, tokens.length]);
  const chats = useMemo(() => {
    const normalizedInbox = filters.inbox === "inbox" ? "primary" : filters.inbox;
    const filtered = indexState.items.filter((item) => {
      if (normalizedInbox !== "all" && item.inbox !== normalizedInbox) return false;
      if (!filters.includeMuted && item.chat.isMuted) return false;
      if (filters.unreadOnly && (item.chat.unreadCount ?? 0) === 0) return false;
      if (normalizedType !== "any" && item.chat.type !== normalizedType) return false;
      return true;
    });
    if (tokens.length === 0) {
      return sortChatsByActivity(filtered.map((item) => item.chat));
    }

    const now = Date.now();
    const filteredById = new Map(filtered.map((item) => [item.chat.id, item]));
    const results = searchIndex ? searchIndex.search(trimmedQuery, ["title", "network", "participants"]) : [];
    const scored = results
      .map((result) => {
        const indexed = filteredById.get(result.id);
        if (!indexed) return null;
        const title = indexed.searchFields.title;
        return {
          chat: indexed.chat,
          exactTitle: normalizedQuery.length > 0 && title === normalizedQuery,
          prefixTitle: normalizedQuery.length > 0 && title.startsWith(normalizedQuery),
          titleHits: result.score.title.hits,
          participantHits: result.score.participants.hits,
          networkHits: result.score.network.hits,
          isSingle: indexed.chat.type === "single",
          timestamp: getChatTimestamp(indexed.chat),
        };
      })
      .filter(
        (
          item,
        ): item is {
          chat: BeeperDesktop.Chat;
          exactTitle: boolean;
          prefixTitle: boolean;
          titleHits: number;
          participantHits: number;
          networkHits: number;
          isSingle: boolean;
          timestamp: number;
        } => Boolean(item),
      );

    const recencyBoost = (timestamp: number) => Math.max(0, 30 - (now - timestamp) / (24 * 60 * 60 * 1000));

    scored.sort((a, b) => {
      if (a.exactTitle !== b.exactTitle) return a.exactTitle ? -1 : 1;
      if (a.prefixTitle !== b.prefixTitle) return a.prefixTitle ? -1 : 1;

      const aRecency = recencyBoost(a.timestamp);
      const bRecency = recencyBoost(b.timestamp);
      if (aRecency !== bRecency) return bRecency - aRecency;

      if (a.titleHits !== b.titleHits) return b.titleHits - a.titleHits;
      if (a.participantHits !== b.participantHits) return b.participantHits - a.participantHits;
      if (a.isSingle !== b.isSingle) return a.isSingle ? -1 : 1;
      if (a.networkHits !== b.networkHits) return b.networkHits - a.networkHits;
      return b.timestamp - a.timestamp;
    });

    return scored.map((item) => item.chat);
  }, [
    filters.includeMuted,
    filters.inbox,
    filters.type,
    filters.unreadOnly,
    indexState.items,
    normalizedQuery,
    normalizedType,
    searchIndex,
    tokens,
    trimmedQuery,
  ]);

  const {
    data: frecencyChats = [],
    visitItem,
    resetRanking,
  } = useFrecencySorting(chats, {
    key: (chat) => chat.id,
  });

  const inboxDropdown = (
    <List.Dropdown
      tooltip="Inbox"
      value={filters.inbox}
      onChange={(value) => setFilters((prev) => ({ ...prev, inbox: value as InboxFilter }))}
    >
      <List.Dropdown.Item title="All Inbox" value="all" />
      <List.Dropdown.Item title="Primary" value="primary" />
      <List.Dropdown.Item title="Low Priority" value="low-priority" />
      <List.Dropdown.Item title="Archive" value="archive" />
    </List.Dropdown>
  );

  const toggleFilter = (key: "unreadOnly" | "includeMuted") => setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const setChatType = (type: ChatTypeFilter) => setFilters((prev) => ({ ...prev, type }));

  const combinedError = accountServicesError ?? error;
  const isLoading = isLoadingAccountServices || (isIndexRefreshing && indexState.items.length === 0);

  const markChatVisited = (chat: BeeperDesktop.Chat) => {
    if (!showSmartSections) return;
    visitItem(chat);
    void setLastChatID(chat.id);
    const next = [chat.id, ...(recentChatIDs ?? []).filter((id) => id !== chat.id)].slice(0, 12);
    void setRecentChatIDs(next);
  };

  const handleArchiveChat = async (chat: BeeperDesktop.Chat, archived: boolean) => {
    const confirmed = await confirmAlert({
      title: archived ? "Archive?" : "Unarchive?",
      message: archived ? "This will move the chat to Archive." : "This will move the chat back to your Inbox.",
      primaryAction: { title: archived ? "Archive" : "Unarchive", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: archived ? "Archiving chat" : "Unarchiving chat",
    });
    try {
      await archiveChat(chat.id, archived);
      toast.style = Toast.Style.Success;
      toast.title = archived ? "Chat archived" : "Chat restored";
      void refreshIndex("full");
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Chat update failed";
      toast.message = getErrorMessage(err);
    }
  };

  const clearReminder = async (chat: BeeperDesktop.Chat) => {
    const confirmed = await confirmAlert({
      title: "Dismiss Reminder?",
      message: "This removes the reminder for this chat.",
      primaryAction: { title: "Dismiss Reminder", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Dismissing reminder" });
    try {
      await deleteChatReminder(chat.id);
      toast.style = Toast.Style.Success;
      toast.title = "Reminder dismissed";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to dismiss reminder";
      toast.message = getErrorMessage(err);
    }
  };

  const setQuickReminder = async (chat: BeeperDesktop.Chat, remindAt: Date, label: string) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Setting reminder (${label})` });
    try {
      await createChatReminder(chat.id, {
        remindAtMs: remindAt.getTime(),
        dismissOnIncomingMessage: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Reminder set";
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Reminder failed";
      toast.message = getErrorMessage(err);
    }
  };

  const sections = useMemo(() => {
    const pinnedIDs = new Set<string>();
    const unreadIDs = new Set<string>();
    const pinnedChats: BeeperDesktop.Chat[] = [];
    const unreadChats: BeeperDesktop.Chat[] = [];

    for (const chat of chats) {
      if (chat.isPinned) {
        pinnedChats.push(chat);
        pinnedIDs.add(chat.id);
      } else if (showUnreadSection && chat.unreadCount > 0) {
        unreadChats.push(chat);
        unreadIDs.add(chat.id);
      }
    }

    const recentIDList = recentChatIDs ?? [];
    const recentIDSet = new Set(recentIDList);
    const chatById = new Map(chats.map((chat) => [chat.id, chat]));

    const recentChats = recentIDList
      .map((id) => chatById.get(id))
      .filter(
        (chat): chat is BeeperDesktop.Chat => Boolean(chat) && !pinnedIDs.has(chat!.id) && !unreadIDs.has(chat!.id),
      );

    const frequentIDs = new Set<string>();
    const frequentChats: BeeperDesktop.Chat[] = [];
    for (const chat of frecencyChats) {
      if (frequentChats.length >= 8) break;
      if (!pinnedIDs.has(chat.id) && !unreadIDs.has(chat.id) && !recentIDSet.has(chat.id)) {
        frequentChats.push(chat);
        frequentIDs.add(chat.id);
      }
    }

    const otherChats = chats.filter(
      (chat) =>
        !pinnedIDs.has(chat.id) && !unreadIDs.has(chat.id) && !recentIDSet.has(chat.id) && !frequentIDs.has(chat.id),
    );

    return { pinnedChats, unreadChats, recentChats, frequentChats, otherChats };
  }, [chats, frecencyChats, recentChatIDs, showUnreadSection]);

  const showSections = showSmartSections && trimmedQuery.length === 0;
  const showUnread = showUnreadSection && sections.unreadChats.length > 0;

  const renderChatItem = (chat: BeeperDesktop.Chat) => {
    const lastActivity = parseDate(chat.lastActivity);
    const openLink = getRaycastFocusLink({ chatID: chat.id });
    const serviceLabel = getChatServiceLabel(chat, accountServices);
    if (!serviceLabel) return null;
    const accessories = [
      ...(chat.unreadCount > 0 ? [{ text: `${chat.unreadCount} unread` }] : []),
      ...(chat.isPinned ? [{ icon: Icon.Pin }] : []),
      ...(chat.isMuted ? [{ icon: Icon.SpeakerOff }] : []),
      ...(chat.isArchived ? [{ icon: Icon.Box }] : []),
      ...(lastActivity ? [{ date: lastActivity }] : []),
    ];

    return (
      <List.Item
        key={chat.id}
        icon={chat.type === "group" ? Icon.TwoPeople : Icon.Person}
        title={chat.title || "Unnamed Chat"}
        subtitle={serviceLabel}
        accessories={accessories}
        detail={
          isShowingDetail ? (
            <List.Item.Detail
              markdown={`# ${chat.title || "Chat"}\n\n${serviceLabel}\n\n**Unread:** ${chat.unreadCount}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Chat ID" text={chat.id} />
                  <List.Item.Detail.Metadata.Label title="Account ID" text={chat.accountID} />
                  <List.Item.Detail.Metadata.Label title="Network" text={serviceLabel} />
                  <List.Item.Detail.Metadata.Label title="Type" text={chat.type} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Status">
                    {chat.isPinned && <List.Item.Detail.Metadata.TagList.Item text="Pinned" color={Color.Orange} />}
                    {chat.isMuted && (
                      <List.Item.Detail.Metadata.TagList.Item text="Muted" color={Color.SecondaryText} />
                    )}
                    {chat.isArchived && (
                      <List.Item.Detail.Metadata.TagList.Item text="Archived" color={Color.SecondaryText} />
                    )}
                  </List.Item.Detail.Metadata.TagList>
                  {chat.lastActivity && (
                    <List.Item.Detail.Metadata.Label title="Last Activity" text={chat.lastActivity} />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          ) : null
        }
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Chat">
              <Action
                title="Open in Beeper"
                icon={Icon.Window}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => {
                  markChatVisited(chat);
                  return focusApp({ chatID: chat.id });
                }}
              />
              <Action.Push
                title="Open Chat"
                icon={Icon.Message}
                target={<ChatThread chat={chat} />}
                onPush={() => markChatVisited(chat)}
              />
              <Action.Push
                title="New Message"
                icon={Icon.Pencil}
                target={<ComposeMessageForm chat={chat} />}
                onPush={() => markChatVisited(chat)}
              />
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Open">
              {openLink && (
                <Action.CreateQuicklink
                  title="Create Chat Quicklink"
                  quicklink={{ link: openLink, name: chat.title || "Beeper Chat" }}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="Remind Me">
              <ActionPanel.Submenu title="Remind Me" icon={Icon.Bell}>
                <Action
                  title="In 1 Hour"
                  onAction={() => setQuickReminder(chat, new Date(Date.now() + 60 * 60 * 1000), "1 hour")}
                />
                <Action
                  title="In 2 Hours"
                  onAction={() => setQuickReminder(chat, new Date(Date.now() + 2 * 60 * 60 * 1000), "2 hours")}
                />
                <Action
                  title="Tomorrow Morning"
                  onAction={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 1);
                    date.setHours(9, 0, 0, 0);
                    return setQuickReminder(chat, date, "tomorrow");
                  }}
                />
                <Action
                  title="Next Week"
                  onAction={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 7);
                    date.setHours(9, 0, 0, 0);
                    return setQuickReminder(chat, date, "next week");
                  }}
                />
                <Action.Push title="Custom…" icon={Icon.Calendar} target={<ReminderForm chat={chat} />} />
              </ActionPanel.Submenu>
              <Action title="Dismiss Reminder" icon={Icon.XMarkCircle} onAction={() => clearReminder(chat)} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Chat Tools">
              <Action.Push title="Show Details" icon={Icon.Info} target={<ChatDetails chat={chat} />} />
              <Action
                title={chat.isArchived ? "Unarchive" : "Archive"}
                icon={chat.isArchived ? Icon.Tray : Icon.Box}
                onAction={() => handleArchiveChat(chat, !chat.isArchived)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard title="Copy Chat ID" content={chat.id} />
              {chat.title && <Action.CopyToClipboard title="Copy Chat Title" content={chat.title} />}
            </ActionPanel.Section>
            <ActionPanel.Section title="Manage">
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => refreshIndex("full")}
              />
              {showSmartSections && (
                <Action title="Reset Smart Ranking" icon={Icon.Repeat} onAction={() => resetRanking(chat)} />
              )}
              {showSmartSections && (
                <Action title="Clear Recent Chats" icon={Icon.Trash} onAction={() => setRecentChatIDs([])} />
              )}
              <ActionPanel.Submenu title="Filters" icon={Icon.Filter}>
                <Action
                  title={`Unread Only: ${filters.unreadOnly ? "On" : "Off"}`}
                  icon={filters.unreadOnly ? Icon.Checkmark : Icon.Circle}
                  onAction={() => toggleFilter("unreadOnly")}
                />
                <Action
                  title={`Include Muted: ${filters.includeMuted ? "On" : "Off"}`}
                  icon={filters.includeMuted ? Icon.Checkmark : Icon.Circle}
                  onAction={() => toggleFilter("includeMuted")}
                />
                <Action title="Type: Any" icon={Icon.BulletPoints} onAction={() => setChatType("any")} />
                <Action title="Type: Direct Messages" icon={Icon.Person} onAction={() => setChatType("single")} />
                <Action title="Type: Group Chats" icon={Icon.TwoPeople} onAction={() => setChatType("group")} />
              </ActionPanel.Submenu>
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchPlaceholder}
      onSearchTextChange={setSearchText}
      searchBarAccessory={inboxDropdown}
      isShowingDetail={isShowingDetail}
      throttle
    >
      {showPinnedSection && sections.pinnedChats.length > 0 && (
        <List.Section title="Pinned">{sections.pinnedChats.map(renderChatItem)}</List.Section>
      )}
      {showUnread && <List.Section title="Unread">{sections.unreadChats.map(renderChatItem)}</List.Section>}
      {showSections && sections.recentChats.length > 0 && (
        <List.Section title="Recent">{sections.recentChats.map(renderChatItem)}</List.Section>
      )}
      {showSections && sections.frequentChats.length > 0 && (
        <List.Section title="Frequently Used">{sections.frequentChats.map(renderChatItem)}</List.Section>
      )}
      {sections.otherChats.length > 0 && (
        <List.Section title="Chats">{sections.otherChats.map(renderChatItem)}</List.Section>
      )}
      {!isLoading && chats.length === 0 && (
        <List.EmptyView
          icon={combinedError ? Icon.Warning : Icon.Message}
          title={combinedError ? "Failed to Load Chats" : "No Chats Found"}
          description={
            combinedError
              ? "Make sure Beeper Desktop is running and the API is enabled, then try Refresh."
              : "Try adjusting your filters or search query."
          }
        />
      )}
    </List>
  );
}

export function ChatThread({ chat }: { chat: BeeperDesktop.Chat }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<BeeperDesktop.Message[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isShowingDetail, setIsShowingDetail] = useCachedState<boolean>("chat-thread:showing-detail", false);

  const trimmedQuery = query.trim();

  const loadFirstPage = async (isCancelled?: () => boolean) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const result =
        trimmedQuery.length > 0
          ? await searchMessages({ query: trimmedQuery, chatIDs: [chat.id], limit: 50 })
          : await listChatMessages(chat.id);
      if (isCancelled?.()) return;
      setMessages(result.items ?? []);
      setHasMore(Boolean(result.hasMore));
      setCursor(result.oldestCursor ?? result.nextCursor ?? result.cursor ?? null);
    } catch (err) {
      if (!isCancelled?.()) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (!isCancelled?.()) {
        setIsLoading(false);
      }
    }
  };

  const loadMore = async () => {
    if (!hasMore || !cursor) return;
    setIsLoadingMore(true);
    try {
      const nextPage =
        trimmedQuery.length > 0
          ? await searchMessages({ query: trimmedQuery, chatIDs: [chat.id], cursor, direction: "before", limit: 50 })
          : await listChatMessages(chat.id, { cursor, direction: "before" });
      setMessages((prev) => [...prev, ...(nextPage.items ?? [])]);
      setHasMore(Boolean(nextPage.hasMore));
      setCursor(nextPage.oldestCursor ?? nextPage.nextCursor ?? nextPage.cursor ?? null);
    } catch (err) {
      await showHUD(`Failed to load more: ${getErrorMessage(err)}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadFirstPage(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [chat.id, trimmedQuery]);

  const showLoadMore = !isLoading && hasMore;

  return (
    <List
      isLoading={isLoading || isLoadingMore}
      navigationTitle={chat.title || "Chat"}
      searchBarPlaceholder="Search within this chat (literal word match)"
      onSearchTextChange={setQuery}
      isShowingDetail={isShowingDetail}
      throttle
    >
      {messages.map((message) => {
        const text = message.text?.trim();
        const preview = text && text.length > 0 ? text : "Message";
        const timestamp = parseDate(message.timestamp);
        const sender = message.senderName || (message.isSender ? "You" : "Unknown");
        const messageID = getMessageID(message);

        return (
          <List.Item
            key={message.id}
            icon={message.isSender ? { source: Icon.Person, tintColor: Color.Blue } : Icon.Message}
            title={preview}
            subtitle={sender}
            detail={
              isShowingDetail ? (
                <List.Item.Detail
                  markdown={`**${sender}**\n\n${message.text || "—"}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Message ID" text={messageID} />
                      <List.Item.Detail.Metadata.Label title="Chat ID" text={message.chatID} />
                      <List.Item.Detail.Metadata.Label title="Timestamp" text={message.timestamp || "N/A"} />
                      {message.isSender && (
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item text="Sent by Me" color={Color.Blue} />
                        </List.Item.Detail.Metadata.TagList>
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : null
            }
            accessories={[...(timestamp ? [{ date: timestamp }] : [])]}
            actions={
              <MessageActions
                chat={chat}
                message={message}
                onRefresh={loadFirstPage}
                onLoadMore={loadMore}
                onToggleDetail={() => setIsShowingDetail((prev) => !prev)}
                isShowingDetail={isShowingDetail}
              />
            }
          />
        );
      })}
      {showLoadMore && (
        <List.Item
          title="Load older messages"
          icon={Icon.ArrowDown}
          actions={
            <ActionPanel>
              <Action title="Load More" icon={Icon.ArrowDown} onAction={loadMore} />
            </ActionPanel>
          }
        />
      )}
      {!isLoading && messages.length === 0 && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.Message}
          title={error ? "Failed to Load Messages" : "No Messages Found"}
          description={
            error
              ? "Make sure Beeper Desktop is running and the API is enabled."
              : "Try a different query or send a new message."
          }
        />
      )}
    </List>
  );
}

function MessageActions({
  chat,
  message,
  onRefresh,
  onLoadMore,
  onToggleDetail,
  isShowingDetail,
}: {
  chat: BeeperDesktop.Chat;
  message: BeeperDesktop.Message;
  onRefresh: () => Promise<void>;
  onLoadMore: () => Promise<void>;
  onToggleDetail: () => void;
  isShowingDetail: boolean;
}) {
  const messageID = getMessageID(message);
  const messageLink = getRaycastFocusLink({ chatID: chat.id, messageID });

  return (
    <ActionPanel>
      <ActionPanel.Section title="Open">
        <Action
          title="Open in Beeper"
          icon={Icon.Window}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => focusApp({ chatID: chat.id, messageID: messageID })}
        />
        <Action title="Open Chat in Beeper" icon={Icon.Message} onAction={() => focusApp({ chatID: chat.id })} />
        {messageLink && (
          <Action.CreateQuicklink
            title="Create Message Quicklink"
            quicklink={{ link: messageLink, name: `Message in ${chat.title || "Beeper"}` }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Message">
        <Action.Push
          title="Reply to Message"
          icon={Icon.ArrowDown}
          target={<ComposeMessageForm chat={chat} replyToMessageID={messageID} />}
        />
        <Action.Push title="New Message" icon={Icon.Pencil} target={<ComposeMessageForm chat={chat} />} />
        {message.isSender && message.text && (
          <Action.Push
            title="Edit Message"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditMessageForm chat={chat} message={message} />}
          />
        )}
        <Action
          title={isShowingDetail ? "Hide Previews" : "Show Previews"}
          icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={onToggleDetail}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        {message.text && <Action.CopyToClipboard title="Copy Message Text" content={message.text} />}
        {message.text && <Action.Paste title="Paste Message Text" content={message.text} />}
        {message.text && (
          <Action.CreateSnippet
            title="Save Message as Snippet"
            snippet={{ text: message.text, name: message.text.slice(0, 50) }}
          />
        )}
        <Action.CopyToClipboard title="Copy Message ID" content={messageID} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Tools">
        <Action.Push title="Show Details" icon={Icon.Info} target={<MessageDetail chat={chat} message={message} />} />
        <Action
          title="Refresh Messages"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
        <Action
          title="Load Older Messages"
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          onAction={onLoadMore}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function MessageDetail({ chat, message }: { chat?: BeeperDesktop.Chat; message: BeeperDesktop.Message }) {
  const messageID = getMessageID(message);
  const sender = message.senderName || (message.isSender ? "You" : "Unknown");
  const chatLine = chat ? `**Chat:** ${chat.title || "Chat"}\n` : "";
  return (
    <Detail
      markdown={`# Message from ${sender}\n\n${chatLine}**Message ID:** ${messageID}\n**Timestamp:** ${
        message.timestamp || "N/A"
      }\n**Text:**\n${message.text || "—"}\n`}
    />
  );
}

export function ComposeMessageForm({
  chat,
  replyToMessageID,
  initialText,
}: {
  chat: BeeperDesktop.Chat;
  replyToMessageID?: string;
  initialText?: string;
}) {
  const { pop } = useNavigation();
  const {
    value: draftText,
    setValue: setDraftText,
    removeValue: removeDraft,
  } = useLocalStorage<string>(`chat:draft:${chat.id}`, "");

  const { handleSubmit, itemProps, values, setValue } = useForm<{
    text: string;
  }>({
    initialValues: {
      text: initialText ?? draftText ?? "",
    },
    onSubmit: async (values) => {
      const text = values.text?.trim();
      if (!text) {
        await showHUD("Add text to send");
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending message" });
      try {
        await sendMessage(chat.id, { text, replyToMessageID });
        toast.style = Toast.Style.Success;
        toast.title = "Message sent";
        await removeDraft();
        pop();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Message failed";
        toast.message = getErrorMessage(err);
      }
    },
  });

  useEffect(() => {
    if (!initialText && draftText && values.text !== draftText) {
      setValue("text", draftText);
    }
  }, [draftText, initialText, setValue, values.text]);

  useEffect(() => {
    if (values.text !== undefined) {
      void setDraftText(values.text);
    }
  }, [setDraftText, values.text]);

  return (
    <Form
      navigationTitle={`Message ${chat.title || "Chat"}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" onSubmit={handleSubmit} />
          {values.text?.length ? (
            <Action
              title="Clear Draft"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              onAction={async () => {
                setValue("text", "");
                await removeDraft();
              }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          replyToMessageID
            ? `Replying to message ${replyToMessageID.slice(0, 8)}…`
            : `Send a message to ${chat.title || "this chat"}. Drafts are saved automatically.`
        }
      />
      <Form.TextArea {...itemProps.text} title="Message" placeholder="Write your message…" />
    </Form>
  );
}

function EditMessageForm({ chat, message }: { chat: BeeperDesktop.Chat; message: BeeperDesktop.Message }) {
  const { pop } = useNavigation();
  const messageID = getMessageID(message);
  const { handleSubmit, itemProps } = useForm<{ text: string }>({
    initialValues: { text: message.text || "" },
    onSubmit: async (values) => {
      const text = values.text?.trim();
      if (!text) {
        await showHUD("Message can't be empty");
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating message" });
      try {
        await updateMessage(chat.id, messageID, { text });
        toast.style = Toast.Style.Success;
        toast.title = "Message updated";
        pop();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Update failed";
        toast.message = getErrorMessage(err);
      }
    },
  });

  return (
    <Form
      navigationTitle={`Edit Message`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea {...itemProps.text} title="Message" />
    </Form>
  );
}

export function ReminderForm({ chat }: { chat: BeeperDesktop.Chat }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ remindAt: Date | null; dismissOnIncoming: boolean }>({
    initialValues: {
      remindAt: new Date(Date.now() + 60 * 60 * 1000),
      dismissOnIncoming: false,
    },
    onSubmit: async (values) => {
      if (!values.remindAt) {
        await showHUD("Pick a reminder date");
        return;
      }
      const remindAtMs = values.remindAt.getTime();
      const toast = await showToast({ style: Toast.Style.Animated, title: "Setting reminder" });
      try {
        await createChatReminder(chat.id, {
          remindAtMs,
          dismissOnIncomingMessage: values.dismissOnIncoming,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Reminder set";
        pop();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Reminder failed";
        toast.message = getErrorMessage(err);
      }
    },
  });

  return (
    <Form
      navigationTitle={`Reminder for ${chat.title || "Chat"}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Reminder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker {...itemProps.remindAt} title="Remind At" />
      <Form.Checkbox {...itemProps.dismissOnIncoming} label="Dismiss on incoming message" />
    </Form>
  );
}

export function ChatDetails({ chat }: { chat: BeeperDesktop.Chat }) {
  const { data, isLoading } = useBeeperDesktop(async () => {
    return retrieveChat(chat.id, { maxParticipantCount: 50 });
  });
  const { data: accountServiceInfoList } = useAccountServiceCache();
  const accountServices = useMemo(
    () => new Map((accountServiceInfoList ?? []).map((account) => [account.accountID, account])),
    [accountServiceInfoList],
  );
  const serviceLabel = getChatServiceLabel(chat, accountServices) ?? "";

  const participantLines = useMemo(() => {
    const participants = data?.participants?.items ?? [];
    if (participants.length === 0) return "No participants available.";
    return participants
      .map((participant) => {
        const name = participant.fullName || participant.username || participant.id;
        return `- ${name}`;
      })
      .join("\n");
  }, [data?.participants?.items]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${data?.title || chat.title || "Chat"}\n\n**Chat ID:** ${chat.id}\n**Account ID:** ${
        chat.accountID
      }\n**Network:** ${serviceLabel}\n**Type:** ${chat.type}\n**Unread:** ${
        chat.unreadCount
      }\n**Pinned:** ${chat.isPinned ? "Yes" : "No"}\n**Muted:** ${
        chat.isMuted ? "Yes" : "No"
      }\n**Archived:** ${chat.isArchived ? "Yes" : "No"}\n\n## Participants\n${participantLines}\n`}
    />
  );
}

function RecentChatsCommand() {
  return (
    <ChatListView
      stateKey="chat"
      searchPlaceholder="Search recent chats"
      defaultFilters={recentDefaultFilters}
      showSmartSections
      showUnreadSection={false}
    />
  );
}

export default withAccessToken(createBeeperOAuth())(RecentChatsCommand);
