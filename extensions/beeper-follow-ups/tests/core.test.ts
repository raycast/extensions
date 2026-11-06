import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Chat,
  handoffDraft,
  latestVisibleMessage,
  loadReplyQueue,
  Message,
  messagePreview,
  ReplyClient,
  validateBaseUrl,
} from "../src/core";
function chat(id: string, extra: Partial<Chat> = {}): Chat {
  return {
    id,
    accountID: "test",
    network: "Test",
    title: id,
    type: "single",
    participants: {
      items: [
        { id: "someone", isSelf: false, isNetworkBot: false },
        { id: "self", isSelf: true, isNetworkBot: false },
      ],
      hasMore: false,
      total: 2,
    },
    unreadCount: 0,
    ...extra,
  };
}
function message(id: string, extra: Partial<Message> = {}): Message {
  return {
    id,
    chatID: "a",
    accountID: "test",
    senderID: "someone",
    timestamp: "2026-10-10T12:00:00Z",
    sortKey: id,
    type: "TEXT",
    isSender: false,
    text: "Hello",
    ...extra,
  };
}
function mockClient(extra: Partial<ReplyClient> = {}): ReplyClient {
  return {
    searchChats: async () => ({
      items: [],
      hasMore: false,
      oldestCursor: null,
    }),
    listMessages: async () => messagePage([]),
    retrieveChat: async (id) => chat(id),
    focus: async () => ({ success: true }),
    ...extra,
  };
}
function messagePage(
  items: Message[],
  hasMore = false,
  oldestCursor: string | null = null,
) {
  return { items, hasMore, oldestCursor };
}
function chatWithBot(id: string): Chat {
  const member = chat(id);
  return {
    ...member,
    participants: {
      ...member.participants,
      items: [
        ...member.participants.items,
        { id: "network-bot", isSelf: false, isNetworkBot: true },
      ],
      total: 3,
    },
  };
}
test("API token can only go to an explicit local HTTP URL", () => {
  assert.equal(
    validateBaseUrl("http://localhost:23373/"),
    "http://localhost:23373",
  );
  assert.equal(validateBaseUrl("http://[::1]:23373"), "http://[::1]:23373");
  for (const url of [
    "https://beeper.com",
    "http://localhost.evil.test",
    "http://user:pass@localhost:23373",
    "http://localhost:23373/private",
    "http://localhost:23373?token=secret",
  ])
    assert.throws(() => validateBaseUrl(url));
});
test("latest visible message ignores reactions, notices, hidden and deleted content and compares large sort keys", () => {
  const m = [
    message("1"),
    message("2", { timestamp: "2026-10-11T12:00:00Z", type: "REACTION" }),
    message("3", { isDeleted: true }),
    message("4", { isHidden: true }),
    message("5", { type: "NOTICE" }),
    message("900719925474099333"),
    message("900719925474099334", { isSender: true }),
  ];
  assert.equal(latestVisibleMessage(m)?.id, "900719925474099334");
});
test("reply queue paginates, handles merged chats, excludes replied/read-only/unknown and reports partial failures", async () => {
  const params: unknown[] = [];
  const c = mockClient({
    searchChats: async (p) => {
      params.push(p);
      return !p.cursor
        ? {
            items: [
              chat("a"),
              chat("answered"),
              chat("unknown"),
              chat("failed"),
              chat("readonly", { isReadOnly: true }),
              chat("merged", { merge: { chatIDs: ["memberA", "memberB"] } }),
              chat("memberA", { mergedIntoChatID: "merged" }),
            ],
            hasMore: true,
            oldestCursor: "opaque_cursor",
          }
        : { items: [chat("a"), chat("b")], hasMore: false, oldestCursor: null };
    },
    listMessages: async (id) => {
      if (id === "failed") throw new Error("offline");
      if (id === "answered")
        return messagePage([
          message("1"),
          message("2", { timestamp: "2026-10-10T13:00:00Z", isSender: true }),
        ]);
      if (id === "unknown")
        return messagePage([message("3", { isSender: undefined })]);
      return messagePage([message("4", { chatID: id })]);
    },
  });
  const result = await loadReplyQueue(
    c,
    14,
    false,
    Date.parse("2026-10-10T14:00:00Z"),
  );
  assert.deepEqual(result.items.map((i) => i.chat.id).sort(), [
    "a",
    "b",
    "merged",
  ]);
  assert.equal(result.failed, 1);
  assert.equal(result.inconclusive, 1);
  assert.equal(result.scanned, 6);
  assert.equal(result.hasMore, false);
  assert.deepEqual(params[1], {
    inbox: "primary",
    type: "single",
    lastActivityAfter: "2026-09-26T14:00:00.000Z",
    includeMuted: false,
    limit: 50,
    cursor: "opaque_cursor",
    direction: "before",
  });
});
test("message reads use at most four concurrent requests", async () => {
  let active = 0,
    peak = 0;
  const c = mockClient({
    searchChats: async () => ({
      items: Array.from({ length: 10 }, (_, i) => chat(String(i))),
      hasMore: false,
      oldestCursor: null,
    }),
    listMessages: async (id) => {
      active++;
      peak = Math.max(active, peak);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return messagePage([message("1", { chatID: id })]);
    },
  });
  assert.equal((await loadReplyQueue(c, 7, false)).items.length, 10);
  assert.equal(peak, 4);
});
test("bounded pagination explicitly reports further conversations", async () => {
  let calls = 0;
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat(String(++calls))],
        hasMore: true,
        oldestCursor: String(calls),
      }),
    }),
    7,
    false,
  );
  assert.equal(calls, 4);
  assert.equal(result.hasMore, true);
});
test("draft handoff refuses existing text, attachments, empty text, or read-only chats and never sends", async () => {
  const focused: unknown[] = [];
  const c = mockClient({
    focus: async (p) => {
      focused.push(p);
      return { success: true };
    },
  });
  await handoffDraft(c, "a", "Draft only");
  assert.deepEqual(focused, [{ chatID: "a", draftText: "Draft only" }]);
  for (const extra of [
    { draft: { text: "Existing draft" } },
    { draft: { text: "", attachments: { id: {} } } },
    { isReadOnly: true },
  ]) {
    await assert.rejects(
      handoffDraft(
        mockClient({
          retrieveChat: async () => chat("a", extra as Partial<Chat>),
          focus: c.focus,
        }),
        "a",
        "Replacement",
      ),
    );
  }
  await assert.rejects(handoffDraft(c, "a", "  "));
  assert.equal(focused.length, 1);
});
test("message previews render third-party markup as literal text", () => {
  const value = messagePreview({
    chat: chat("a"),
    message: message("1", {
      text: "![external image](https://tracker.test/image) <script>",
    }),
  });
  assert.ok(
    value.includes(
      "\\!\\[external image\\]\\(https://tracker\\.test/image\\) \\<script\\>",
    ),
  );
});

test("merged conversations inspect older pages when recent events are ignored", async () => {
  let memberReads = 0;
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("merged", { merge: { chatIDs: ["memberA", "memberB"] } })],
        hasMore: false,
        oldestCursor: null,
      }),
      listMessages: async (id, params) => {
        if (id === "memberA") {
          memberReads++;
          return params?.cursor
            ? messagePage([
                message("2", {
                  timestamp: "2026-10-10T12:00:00Z",
                  isSender: true,
                }),
              ])
            : messagePage(
                [
                  message("3", {
                    timestamp: "2026-10-10T13:00:00Z",
                    type: "NOTICE",
                  }),
                ],
                true,
                "older",
              );
        }
        return messagePage([
          message("1", { timestamp: "2026-10-10T11:00:00Z" }),
        ]);
      },
    }),
    7,
    false,
  );
  assert.equal(memberReads, 2);
  assert.equal(result.items.length, 0);
  assert.equal(result.inconclusive, 0);
});
test("inconclusive message history is flagged and never classifies another merged member as awaiting reply", async () => {
  let page = 0;
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("merged", { merge: { chatIDs: ["memberA", "memberB"] } })],
        hasMore: false,
        oldestCursor: null,
      }),
      listMessages: async (id) =>
        id === "memberA"
          ? messagePage(
              [message("1", { type: "REACTION" })],
              true,
              String(++page),
            )
          : messagePage([message("2")]),
    }),
    7,
    false,
  );
  assert.equal(page, 3);
  assert.equal(result.inconclusive, 1);
  assert.equal(result.items.length, 0);
});
test("Beeper focus success false cannot produce a successful draft claim", async () => {
  await assert.rejects(
    handoffDraft(
      mockClient({ focus: async () => ({ success: false }) }),
      "a",
      "Draft only",
    ),
    /did not open/,
  );
});

test("queue retrieves complete member metadata before reading messages", async () => {
  const retrieved: unknown[] = [];
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("a")],
        hasMore: false,
        oldestCursor: null,
      }),
      retrieveChat: async (id, params) => {
        retrieved.push({ id, params });
        return chat(id);
      },
      listMessages: async () => {
        assert.deepEqual(retrieved, [
          { id: "a", params: { maxParticipantCount: -1 } },
        ]);
        return messagePage([message("1")]);
      },
    }),
    7,
    false,
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.inconclusive, 0);
});

test("newer network-bot TEXT events cannot mask the latest human incoming or outgoing message", async () => {
  for (const outgoing of [false, true]) {
    let reads = 0;
    const result = await loadReplyQueue(
      mockClient({
        searchChats: async () => ({
          items: [chat("a")],
          hasMore: false,
          oldestCursor: null,
        }),
        retrieveChat: async (id) => chatWithBot(id),
        listMessages: async () => {
          reads++;
          return messagePage([
            message("3", {
              senderID: "network-bot",
              timestamp: "2026-10-10T14:00:00Z",
              type: "TEXT",
            }),
            message("2", {
              senderID: outgoing ? "self" : "someone",
              timestamp: "2026-10-10T13:00:00Z",
              isSender: outgoing,
            }),
            message("1"),
          ]);
        },
      }),
      7,
      false,
    );
    assert.equal(reads, 1);
    assert.equal(result.items.length, outgoing ? 0 : 1);
    if (!outgoing) assert.equal(result.items[0].message.id, "2");
    assert.equal(result.inconclusive, 0);
  }
});

test("bot-only pages continue older pagination rather than becoming queue entries", async () => {
  const reads: unknown[] = [];
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("a")],
        hasMore: false,
        oldestCursor: null,
      }),
      retrieveChat: async (id) => chatWithBot(id),
      listMessages: async (id, params) => {
        reads.push({ id, params });
        return params?.cursor
          ? messagePage([message("1")])
          : messagePage(
              [
                message("2", {
                  senderID: "network-bot",
                  isSender: undefined,
                  timestamp: "2026-10-10T13:00:00Z",
                }),
              ],
              true,
              "older",
            );
      },
    }),
    7,
    false,
  );
  assert.deepEqual(reads, [
    { id: "a", params: undefined },
    { id: "a", params: { cursor: "older", direction: "before" } },
  ]);
  assert.equal(result.items[0].message.id, "1");
  assert.equal(result.inconclusive, 0);
});

test("bounded bot-only histories are inconclusive when older messages remain", async () => {
  let reads = 0;
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("a")],
        hasMore: false,
        oldestCursor: null,
      }),
      retrieveChat: async (id) => chatWithBot(id),
      listMessages: async () =>
        messagePage(
          [message(String(++reads), { senderID: "network-bot" })],
          true,
          `older-${reads}`,
        ),
    }),
    7,
    false,
  );
  assert.equal(reads, 3);
  assert.equal(result.items.length, 0);
  assert.equal(result.inconclusive, 1);
});

test("unknown incoming identity or incomplete metadata is inconclusive without falling back to older human text", async () => {
  const normal = chat("a");
  const cases = [
    {
      name: "unmatched sender",
      member: normal,
      candidate: message("2", { senderID: "unknown" }),
    },
    {
      name: "different ID namespace",
      member: normal,
      candidate: message("2", { senderID: "network:someone" }),
    },
    {
      name: "participants have more pages",
      member: chat("a", {
        participants: { ...normal.participants, hasMore: true },
      }),
      candidate: message("2"),
    },
    {
      name: "participant count is incomplete",
      member: chat("a", {
        participants: { ...normal.participants, total: 3 },
      }),
      candidate: message("2"),
    },
    {
      name: "incoming message identifies self",
      member: normal,
      candidate: message("2", { senderID: "self" }),
    },
    {
      name: "sender direction is unknown",
      member: normal,
      candidate: message("2", { isSender: undefined }),
    },
  ];
  for (const { name, member, candidate } of cases) {
    const result = await loadReplyQueue(
      mockClient({
        searchChats: async () => ({
          items: [chat("a")],
          hasMore: false,
          oldestCursor: null,
        }),
        retrieveChat: async () => member,
        listMessages: async () =>
          messagePage([
            { ...candidate, timestamp: "2026-10-10T13:00:00Z" },
            message("1"),
          ]),
      }),
      7,
      false,
    );
    assert.equal(result.items.length, 0, name);
    assert.equal(result.inconclusive, 1, name);
    assert.equal(result.failed, 0, name);
  }
});

test("matched normal participants remain eligible when the optional bot flag is omitted", async () => {
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("a")],
        hasMore: false,
        oldestCursor: null,
      }),
      retrieveChat: async () =>
        chat("a", {
          participants: {
            items: [
              { id: "someone", isSelf: false },
              { id: "self", isSelf: true },
            ],
            hasMore: false,
            total: 2,
          },
        }),
      listMessages: async () => messagePage([message("1")]),
    }),
    7,
    false,
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.inconclusive, 0);
});

test("explicit outgoing messages exclude the queue without inferred sender membership", async () => {
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("a")],
        hasMore: false,
        oldestCursor: null,
      }),
      retrieveChat: async () =>
        chat("a", {
          participants: { items: [], hasMore: true, total: 2 },
        }),
      listMessages: async () =>
        messagePage([
          message("2", {
            senderID: "unmatched-self",
            timestamp: "2026-10-10T13:00:00Z",
            isSender: true,
          }),
          message("1"),
        ]),
    }),
    7,
    false,
  );
  assert.equal(result.items.length, 0);
  assert.equal(result.inconclusive, 0);
});

test("merged conversations use each member's bot and human metadata", async () => {
  const metadataReads: string[] = [];
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("merged", { merge: { chatIDs: ["memberA", "memberB"] } })],
        hasMore: false,
        oldestCursor: null,
      }),
      retrieveChat: async (id, params) => {
        metadataReads.push(id);
        assert.deepEqual(params, { maxParticipantCount: -1 });
        return id === "memberA"
          ? chatWithBot(id)
          : chat(id, {
              participants: {
                items: [
                  { id: "member-contact", isSelf: false, isNetworkBot: false },
                  { id: "self", isSelf: true, isNetworkBot: false },
                ],
                hasMore: false,
                total: 2,
              },
            });
      },
      listMessages: async (id) =>
        messagePage([
          message(id === "memberA" ? "2" : "1", {
            chatID: id,
            senderID: id === "memberA" ? "network-bot" : "member-contact",
            timestamp:
              id === "memberA"
                ? "2026-10-10T13:00:00Z"
                : "2026-10-10T12:00:00Z",
          }),
        ]),
    }),
    7,
    false,
  );
  assert.deepEqual(metadataReads, ["memberA", "memberB"]);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].message.chatID, "memberB");
  assert.equal(result.inconclusive, 0);
});

test("an unknown merged member prevents classifying another member's incoming message", async () => {
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("merged", { merge: { chatIDs: ["memberA", "memberB"] } })],
        hasMore: false,
        oldestCursor: null,
      }),
      retrieveChat: async (id) => chat(id),
      listMessages: async (id) =>
        messagePage([
          message(id === "memberA" ? "1" : "2", {
            chatID: id,
            senderID: id === "memberA" ? "unknown-member-sender" : "someone",
            timestamp:
              id === "memberA"
                ? "2026-10-10T11:00:00Z"
                : "2026-10-10T12:00:00Z",
          }),
        ]),
    }),
    7,
    false,
  );
  assert.equal(result.items.length, 0);
  assert.equal(result.inconclusive, 1);
});

test("failed member metadata is counted as a failed conversation before any message read", async () => {
  let reads = 0;
  const result = await loadReplyQueue(
    mockClient({
      searchChats: async () => ({
        items: [chat("a")],
        hasMore: false,
        oldestCursor: null,
      }),
      retrieveChat: async () => {
        throw new Error("Synthetic metadata failure");
      },
      listMessages: async () => {
        reads++;
        return messagePage([message("1")]);
      },
    }),
    7,
    false,
  );
  assert.equal(reads, 0);
  assert.equal(result.items.length, 0);
  assert.equal(result.failed, 1);
});
