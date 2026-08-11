import type { SQLChat } from "./chat-query";

type PersistedChatRow = {
  chat_row_id: number;
  guid: string;
  chat_identifier: string;
  display_name: string | null;
  service_name: "iMessage" | "SMS";
  group_id: string | null;
  original_group_id: string | null;
  latest_message_guid: string | null;
  group_photo_path: string | null;
  is_filtered: number | null;
  group_name: string | null;
  is_group: boolean | number;
  last_message_timestamp: number | string | null;
  last_message_date: string;
  group_participants: string | null;
};

export type PersistedChatCatalog = {
  version: 1;
  updatedAtEpochMs: number;
  filterSpam: boolean;
  filterUnknownSenders: boolean;
  chats: PersistedChatRow[];
};

export type ChatCatalogPrefs = {
  filterSpam: boolean;
  filterUnknownSenders: boolean;
};

export function emptyPersistedChatCatalog(): PersistedChatCatalog {
  return {
    version: 1,
    updatedAtEpochMs: 0,
    filterSpam: false,
    filterUnknownSenders: false,
    chats: [],
  };
}

export function chatCatalogToPersisted(chats: readonly SQLChat[], prefs: ChatCatalogPrefs): PersistedChatCatalog {
  return {
    version: 1,
    updatedAtEpochMs: Date.now(),
    filterSpam: prefs.filterSpam,
    filterUnknownSenders: prefs.filterUnknownSenders,
    chats: chats.map(chatCatalogRowToPersisted),
  };
}

function chatCatalogRowToPersisted(chat: SQLChat): PersistedChatRow {
  return {
    chat_row_id: chat.chat_row_id,
    guid: chat.guid,
    chat_identifier: chat.chat_identifier,
    display_name: chat.display_name,
    service_name: chat.service_name,
    group_id: chat.group_id,
    original_group_id: chat.original_group_id,
    latest_message_guid: chat.latest_message_guid,
    group_photo_path: chat.group_photo_path,
    is_filtered: chat.is_filtered,
    group_name: chat.group_name,
    is_group: chat.is_group,
    last_message_timestamp: chat.last_message_timestamp,
    last_message_date: chat.last_message_date,
    group_participants: chat.group_participants,
  };
}

function persistedRowToSQLChat(row: PersistedChatRow): SQLChat {
  return {
    ...row,
    is_group: row.is_group,
  };
}

export function persistedChatCatalogToSQLChats(catalog: PersistedChatCatalog): SQLChat[] {
  return catalog.chats.map(persistedRowToSQLChat);
}

export function chatCatalogMatchesPrefs(catalog: PersistedChatCatalog, prefs: ChatCatalogPrefs): boolean {
  return catalog.filterSpam === prefs.filterSpam && catalog.filterUnknownSenders === prefs.filterUnknownSenders;
}

function isPersistedChatRow(row: unknown): row is PersistedChatRow {
  if (!row || typeof row !== "object") return false;
  const candidate = row as Partial<PersistedChatRow>;
  return (
    typeof candidate.guid === "string" &&
    typeof candidate.chat_identifier === "string" &&
    (candidate.service_name === "iMessage" || candidate.service_name === "SMS")
  );
}

export function parsePersistedChatCatalog(raw: string | undefined): PersistedChatCatalog | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedChatCatalog;
    if (parsed?.version !== 1 || !Array.isArray(parsed.chats)) {
      return undefined;
    }

    return {
      version: 1,
      updatedAtEpochMs: typeof parsed.updatedAtEpochMs === "number" ? parsed.updatedAtEpochMs : 0,
      filterSpam: Boolean(parsed.filterSpam),
      filterUnknownSenders: Boolean(parsed.filterUnknownSenders),
      chats: parsed.chats.filter(isPersistedChatRow),
    };
  } catch {
    return undefined;
  }
}

export function serializePersistedChatCatalog(catalog: PersistedChatCatalog): string {
  return JSON.stringify(catalog);
}
