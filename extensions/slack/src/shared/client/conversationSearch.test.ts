import assert from "node:assert/strict";
import test from "node:test";
import type { SlackConversation, SlackMember } from "./slackTypes";
import { loadUserNames, searchConversationDirectory } from "./conversationSearch";

const teamId = "T1";

test("matches and labels groups with member visible names from every user page", async () => {
  const usersByCursor: Record<string, { items: SlackMember[]; nextCursor?: string }> = {
    first: {
      items: [{ id: "U1", name: "alice", profile: { real_name: "Alice Smith" } }],
      nextCursor: "users-2",
    },
    "users-2": { items: [{ id: "U2", name: "bob", profile: { real_name: "Bob Jones" } }] },
  };

  const userNames = await loadUserNames(async (cursor) => usersByCursor[cursor ?? "first"]);
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
    ["Alice Smith, Bob Jones"],
  );
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
