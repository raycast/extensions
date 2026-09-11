import assert from "node:assert/strict";
import test from "node:test";
import type { SlackConversation, SlackMember } from "./slackTypes";
import { searchConversationDirectory, searchUserNames } from "./conversationSearch";

const teamId = "T1";

test("matches and labels groups with relevant member visible names from later user pages", async () => {
  const usersByCursor: Record<string, { items: SlackMember[]; nextCursor?: string }> = {
    first: {
      items: [{ id: "U2", name: "bob", profile: { real_name: "Bob Jones" } }],
      nextCursor: "users-2",
    },
    "users-2": { items: [{ id: "U1", name: "alice", profile: { real_name: "Alice Smith" } }] },
  };

  const userNames = await searchUserNames({
    query: "Alice Smith",
    maxResults: 100,
    loadPage: async (cursor) => usersByCursor[cursor ?? "first"],
  });
  const [, groups] = await searchConversationDirectory({
    query: "Alice Smith",
    maxResultsPerType: 100,
    userNames,
    loadConversationsPage: async () => ({
      items: [
        {
          id: "G1",
          name: "mpdm-alice--bob-1",
          is_mpim: true,
          internal_team_ids: [teamId],
        },
      ],
    }),
  });

  assert.deepEqual(
    groups.map((group) => group.name),
    ["Alice Smith, bob"],
  );
});

test("skips the user directory for an empty conversation query", async () => {
  let pageLoads = 0;

  const userNames = await searchUserNames({
    query: "   ",
    maxResults: 100,
    loadPage: async () => {
      pageLoads += 1;
      return { items: [{ id: "U1", name: "alice", profile: { real_name: "Alice Smith" } }] };
    },
  });

  assert.equal(pageLoads, 0);
  assert.equal(userNames.size, 0);
});

test("retains only user names matching the conversation query", async () => {
  const userNames = await searchUserNames({
    query: "Alice",
    maxResults: 100,
    loadPage: async () => ({
      items: [
        { id: "U1", name: "alice", profile: { real_name: "Alice Smith" } },
        { id: "U2", name: "bob", profile: { real_name: "Bob Jones" } },
      ],
    }),
  });

  assert.deepEqual([...userNames], [["alice", "Alice Smith"]]);
});

test("continues searching after a page containing a matching conversation", async () => {
  const conversationCursors: Array<string | undefined> = [];
  const conversationsByCursor: Record<string, { items: SlackConversation[]; nextCursor?: string }> = {
    first: {
      items: [{ id: "C1", name: "ops", internal_team_ids: [teamId] }],
      nextCursor: "conversations-2",
    },
    "conversations-2": {
      items: [{ id: "C2", name: "ops-roadmap", internal_team_ids: [teamId] }],
    },
  };

  const [channels] = await searchConversationDirectory({
    query: "ops",
    maxResultsPerType: 100,
    userNames: new Map(),
    loadConversationsPage: async (cursor) => {
      conversationCursors.push(cursor);
      return conversationsByCursor[cursor ?? "first"];
    },
  });

  assert.deepEqual(conversationCursors, [undefined, "conversations-2"]);
  assert.deepEqual(
    channels.map((channel) => channel.name),
    ["ops", "ops-roadmap"],
  );
});

test("channel search completes from a mixed page while group enrichment remains pending", async () => {
  let resolveNames!: (names: ReadonlyMap<string, string>) => void;
  const names = new Promise<ReadonlyMap<string, string>>((resolve) => {
    resolveNames = resolve;
  });
  let groupFinished = false;
  const page = {
    items: [
      { id: "C1", name: "alice-project", internal_team_ids: [teamId] },
      { id: "G1", name: "mpdm-asmith--bob-1", is_mpim: true, internal_team_ids: [teamId] },
    ],
  };
  const options = {
    query: "Alice",
    maxResultsPerType: 100,
    loadConversationsPage: async () => page,
    loadUserNames: () => names,
  };
  const groups = searchConversationDirectory({ ...options, types: "groups" }).then((result) => {
    groupFinished = true;
    return result;
  });
  const [channels] = await searchConversationDirectory({ ...options, types: "channels" });
  assert.equal(channels[0].id, "C1");
  assert.equal(groupFinished, false);
  resolveNames(new Map([["asmith", "Alice Smith"]]));
  assert.equal((await groups)[1][0].name, "Alice Smith, bob");
});

test("name enrichment finds a visible name beyond 100 profile-only matches", async () => {
  const names = await searchUserNames({
    query: "Alice",
    maxResults: 100,
    loadPage: async (cursor) =>
      cursor
        ? { items: [{ id: "UA", name: "asmith", profile: { real_name: "Alice Smith" } }] }
        : {
            items: Array.from({ length: 100 }, (_, i) => ({
              id: `U${i}`,
              name: `user${i}`,
              profile: { real_name: `Person ${i}`, title: "Alice project" },
            })),
            nextCursor: "next",
          },
  });
  assert.equal(names.size, 100);
  assert.equal(names.get("asmith"), "Alice Smith");
});

test("retains visible-name matches from every page until the directory ends", async () => {
  const cursors: Array<string | undefined> = [];
  const names = await searchUserNames({
    query: "Alice",
    maxResults: 100,
    loadPage: async (cursor) => {
      cursors.push(cursor);
      return cursor
        ? { items: [{ id: "U2", name: "ajohnson", profile: { real_name: "Alice Johnson" } }] }
        : { items: [{ id: "U1", name: "asmith", profile: { real_name: "Alice Smith" } }], nextCursor: "next" };
    },
  });
  assert.deepEqual(cursors, [undefined, "next"]);
  assert.deepEqual([...names.values()], ["Alice Smith", "Alice Johnson"]);
});

test("stops name lookup only when 100 visible matches replace retained profile matches", async () => {
  let pages = 0;
  const names = await searchUserNames({
    query: "Alice",
    maxResults: 100,
    loadPage: async () => {
      pages++;
      assert.ok(pages <= 3, "Must stop at the preferred-result limit");
      const items =
        pages === 1
          ? Array.from({ length: 100 }, (_, i) => ({
              id: `UH${i}`,
              name: `hidden${i}`,
              profile: { real_name: `Person ${i}`, title: "Alice project" },
            }))
          : Array.from({ length: 50 }, (_, i) => ({
              id: `UA${pages}${i}`,
              name: `alice${pages}${i}`,
              profile: { real_name: `Alice ${pages}-${i}` },
            }));
      return { items, nextCursor: String(pages) };
    },
  });
  assert.equal(pages, 3);
  assert.equal(names.size, 100);
  assert.ok([...names.values()].every((name) => name.startsWith("Alice ")));
});
