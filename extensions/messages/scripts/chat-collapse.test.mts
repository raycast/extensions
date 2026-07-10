import assert from "node:assert/strict";
import test from "node:test";

import { collapseChatRows, type CollapsibleChatRow } from "../src/chat-collapse.ts";

type TestChatRow = CollapsibleChatRow & {
  id: string;
  guid: string;
  service_name: "iMessage" | "SMS";
  group_participants: string | null;
};

function chatRow(overrides: Partial<TestChatRow> = {}): TestChatRow {
  const id = overrides.id ?? "row";
  const isGroup = overrides.is_group ?? true;

  return {
    id,
    guid: `${id}-guid`,
    chat_identifier: `${isGroup ? "chat" : "direct"}-${id}`,
    service_name: "iMessage",
    display_name: "Group",
    group_name: "Group",
    group_participants: "participant-a,participant-b",
    group_id: `${id}-group`,
    original_group_id: null,
    is_group: isGroup,
    chat_row_id: 1,
    last_message_timestamp: 1,
    last_message_date: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("collapses group rows with the same group_id", () => {
  const rows = [
    chatRow({
      id: "older",
      chat_identifier: "chat-older",
      group_id: "shared",
      chat_row_id: 1,
      last_message_timestamp: 10,
    }),
    chatRow({
      id: "newer",
      chat_identifier: "chat-newer",
      group_id: "shared",
      chat_row_id: 2,
      last_message_timestamp: 20,
    }),
  ];

  const collapsed = collapseChatRows(rows);

  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].id, "newer");
  assert.equal(collapsed[0].chat_identifier, "chat-newer");
});

test("collapses group rows through transitive original_group_id lineage", () => {
  const rows = [
    chatRow({ id: "oldest", group_id: "group-a", original_group_id: null, chat_row_id: 1, last_message_timestamp: 10 }),
    chatRow({
      id: "middle",
      group_id: "group-b",
      original_group_id: "group-a",
      chat_row_id: 2,
      last_message_timestamp: 20,
    }),
    chatRow({
      id: "newest",
      group_id: "group-c",
      original_group_id: "group-b",
      chat_row_id: 3,
      last_message_timestamp: 30,
    }),
  ];

  const collapsed = collapseChatRows(rows);

  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].id, "newest");
});

test("keeps groups separate when they only share a display name", () => {
  const rows = [
    chatRow({ id: "first", display_name: "Same Name", group_name: "Same Name", group_id: "group-a" }),
    chatRow({ id: "second", display_name: "Same Name", group_name: "Same Name", group_id: "group-b" }),
  ];

  const collapsed = collapseChatRows(rows);

  assert.equal(collapsed.length, 2);
  assert.deepEqual(collapsed.map((row) => row.id).sort(), ["first", "second"]);
});

test("uses the newest non-empty display name for a collapsed group", () => {
  const rows = [
    chatRow({
      id: "older",
      display_name: "Old Name",
      group_name: "Old Name",
      group_id: "shared",
      chat_row_id: 1,
      last_message_timestamp: 10,
    }),
    chatRow({
      id: "newer",
      display_name: " New Name ",
      group_name: " New Name ",
      group_id: "shared",
      chat_row_id: 2,
      last_message_timestamp: 20,
    }),
  ];

  const collapsed = collapseChatRows(rows);

  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].display_name, "New Name");
  assert.equal(collapsed[0].group_name, "New Name");
});

test("collapses direct chats with the same chat_identifier to the newest row", () => {
  const rows = [
    chatRow({
      id: "older",
      chat_identifier: "direct-shared",
      is_group: false,
      group_id: null,
      original_group_id: null,
      chat_row_id: 1,
      last_message_timestamp: 10,
    }),
    chatRow({
      id: "newer",
      chat_identifier: "direct-shared",
      is_group: false,
      group_id: null,
      original_group_id: null,
      chat_row_id: 2,
      last_message_timestamp: 20,
    }),
  ];

  const collapsed = collapseChatRows(rows);

  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].id, "newer");
});

test("collapses direct chats with different identifiers after they resolve to the same contact", () => {
  const rows = [
    chatRow({
      id: "older",
      chat_identifier: "direct-old-handle",
      contactId: "contact-a",
      is_group: false,
      group_id: null,
      original_group_id: null,
      searchableText: "old-search-token",
      chat_row_id: 1,
      last_message_timestamp: 10,
    }),
    chatRow({
      id: "newer",
      chat_identifier: "direct-new-handle",
      contactId: "contact-a",
      is_group: false,
      group_id: null,
      original_group_id: null,
      searchableText: "new-search-token",
      chat_row_id: 2,
      last_message_timestamp: 20,
    }),
  ];

  const collapsed = collapseChatRows(rows);

  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].id, "newer");
  assert.equal(collapsed[0].chat_identifier, "direct-new-handle");
  assert.match(collapsed[0].searchableText ?? "", /old-search-token/);
  assert.match(collapsed[0].searchableText ?? "", /new-search-token/);
  assert.match(collapsed[0].searchableText ?? "", /direct-old-handle/);
});

test("keeps direct chats separate when they only share a display name", () => {
  const rows = [
    chatRow({
      id: "first",
      chat_identifier: "direct-first",
      contactId: "contact-a",
      display_name: "Same Name",
      is_group: false,
      group_id: null,
      original_group_id: null,
      chat_row_id: 1,
      last_message_timestamp: 10,
    }),
    chatRow({
      id: "second",
      chat_identifier: "direct-second",
      contactId: "contact-b",
      display_name: "Same Name",
      is_group: false,
      group_id: null,
      original_group_id: null,
      chat_row_id: 2,
      last_message_timestamp: 20,
    }),
  ];

  const collapsed = collapseChatRows(rows);

  assert.equal(collapsed.length, 2);
  assert.deepEqual(collapsed.map((row) => row.id).sort(), ["first", "second"]);
});
