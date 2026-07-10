import assert from "node:assert/strict";
import test from "node:test";

import type { SQLChat } from "../src/chat-query.ts";
import {
  chatCatalogMatchesPrefs,
  chatCatalogToPersisted,
  emptyPersistedChatCatalog,
  parsePersistedChatCatalog,
  persistedChatCatalogToSQLChats,
  persistedRowToSQLChat,
  chatCatalogRowToPersisted,
} from "../src/open-chat-catalog-persist.ts";

function sampleChat(overrides: Partial<SQLChat> = {}): SQLChat {
  return {
    chat_row_id: 1,
    guid: "chat-guid-1",
    chat_identifier: "+15551234567",
    display_name: null,
    service_name: "iMessage",
    group_id: null,
    original_group_id: null,
    latest_message_guid: "message-guid-1",
    group_photo_path: null,
    is_filtered: null,
    group_name: null,
    is_group: 0,
    last_message_timestamp: 1_700_000_000_000_000_000,
    last_message_date: "2026-01-01T00:00:00.000Z",
    group_participants: "+15551234567",
    ...overrides,
  };
}

test("chatCatalogToPersisted stores collapsed chat rows with prefs", () => {
  const persisted = chatCatalogToPersisted([sampleChat()], {
    filterSpam: true,
    filterUnknownSenders: false,
  });

  assert.equal(persisted.version, 1);
  assert.equal(persisted.filterSpam, true);
  assert.equal(persisted.filterUnknownSenders, false);
  assert.equal(persisted.chats[0]?.chat_identifier, "+15551234567");
});

test("persisted round-trip rebuilds SQLChat rows", () => {
  const original = sampleChat({ chat_row_id: 42, guid: "chat-guid-42" });
  const persisted = chatCatalogToPersisted([original], { filterSpam: false, filterUnknownSenders: false });
  const restored = persistedChatCatalogToSQLChats(persisted);

  assert.equal(restored.length, 1);
  assert.deepEqual(restored[0], chatCatalogRowToPersisted(original));
  assert.deepEqual(persistedRowToSQLChat(restored[0]!), original);
});

test("chatCatalogMatchesPrefs rejects mismatched filter prefs", () => {
  const catalog = chatCatalogToPersisted([sampleChat()], {
    filterSpam: false,
    filterUnknownSenders: false,
  });

  assert.equal(
    chatCatalogMatchesPrefs(catalog, { filterSpam: false, filterUnknownSenders: false }),
    true,
  );
  assert.equal(chatCatalogMatchesPrefs(catalog, { filterSpam: true, filterUnknownSenders: false }), false);
  assert.equal(chatCatalogMatchesPrefs(catalog, { filterSpam: false, filterUnknownSenders: true }), false);
});

test("parsePersistedChatCatalog rejects invalid payloads", () => {
  assert.equal(parsePersistedChatCatalog(undefined), undefined);
  assert.equal(parsePersistedChatCatalog("{"), undefined);
  assert.equal(parsePersistedChatCatalog(JSON.stringify({ version: 2, chats: [] })), undefined);
  assert.equal(parsePersistedChatCatalog(JSON.stringify({ version: 1, chats: null })), undefined);
});

test("emptyPersistedChatCatalog has no rows", () => {
  const empty = emptyPersistedChatCatalog();
  assert.equal(empty.chats.length, 0);
  assert.equal(empty.version, 1);
});
