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
