import { fetchAllContacts } from "swift:../../swift/contacts";

import { persistedCatalogToContacts } from "../contact-catalog-persist";
import { fuzzySearch } from "../helpers";
import { createMessagesCache, loadPersistedContactCatalog, savePersistedContactCatalog } from "../messages-cache";
import { buildRecipientSections, type Recipient } from "../recipient-catalog";
import type { Contact } from "../types";

import { getChats } from "./get-chats";

type SearchMessageRecipientsOptions = {
  unreadOnly?: boolean;
  from?: string;
  to?: string;
  limit?: number;
};

const CONTACT_CATALOG_MAX_AGE_MS = 5 * 60 * 1000;
let pendingContactCatalog: Promise<Contact[]> | undefined;

export type MessageRecipientSearchResult = {
  kind: "chat" | "contact";
  chatGuid: string | null;
  chatIdentifier: string;
  displayName: string;
  service: "iMessage" | "SMS" | "auto";
  isGroup: boolean;
  participants: string[];
  unreadCount: number | null;
  lastMessageDate: string | null;
};

function searchTerms(value: string): string[] {
  return value.toLowerCase().split(/\s+/).filter(Boolean);
}

async function getContactCatalog(): Promise<Contact[]> {
  const cache = createMessagesCache();
  const persisted = loadPersistedContactCatalog(cache);
  if (persisted.updatedAtEpochMs > Date.now() - CONTACT_CATALOG_MAX_AGE_MS) {
    return persistedCatalogToContacts(persisted);
  }

  pendingContactCatalog ??= (async () => {
    const contacts = (await fetchAllContacts()) as Contact[];
    savePersistedContactCatalog(cache, contacts);
    return contacts;
  })().finally(() => {
    pendingContactCatalog = undefined;
  });
  return pendingContactCatalog;
}

function mapRecipient(recipient: Recipient): MessageRecipientSearchResult {
  return {
    kind: recipient.kind === "recent" ? "chat" : "contact",
    chatGuid: recipient.chat_guid ?? null,
    chatIdentifier: recipient.chat_identifier,
    displayName: recipient.displayName,
    service: recipient.service_name,
    isGroup: recipient.is_group,
    participants: recipient.group_participants?.split(",").map((participant) => participant.trim()) ?? [],
    unreadCount: recipient.kind === "recent" ? Number(recipient.unread_count ?? 0) : null,
    lastMessageDate: recipient.kind === "recent" ? (recipient.last_message_date ?? null) : null,
  };
}

export async function searchMessageRecipients(
  searchText: string = "",
  options: SearchMessageRecipientsOptions = {},
): Promise<MessageRecipientSearchResult[]> {
  const limit = options.limit ?? 50;
  const hasActivityFilters = Boolean(options.unreadOnly || options.from || options.to);
  const terms = searchTerms(searchText);
  const contacts = terms.length && !hasActivityFilters ? await getContactCatalog() : undefined;
  const chats = await getChats(searchText, { ...options, contacts });

  if (!terms.length || hasActivityFilters) {
    return buildRecipientSections(chats, [], false).recents.map(mapRecipient).slice(0, limit);
  }

  const sections = buildRecipientSections(chats, contacts ?? [], false);
  const matchingContacts = sections.contacts.filter((contact) => fuzzySearch(contact.keywords.join(" "), terms));

  return [...sections.recents, ...matchingContacts].map(mapRecipient).slice(0, limit);
}
