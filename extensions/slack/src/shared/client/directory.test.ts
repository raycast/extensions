import assert from "node:assert/strict";
import test from "node:test";
import { searchConversationDirectory } from "./conversationSearch";
import {
  createDirectoryUserSearch,
  mergeDirectorySearchResults,
  mergeVisitedDirectoryItems,
  rememberVisitedDirectoryItem,
} from "./directory";

test("member rows and group names share one user lookup per query", async () => {
  let calls = 0;
  const search = createDirectoryUserSearch(async () => {
    calls++;
    return { users: [{ username: "alice", name: "Alice Smith" }], userNames: new Map([["alice", "Alice Smith"]]) };
  });
  const [users, names] = await Promise.all([search.getUsers(), search.getUserNames()]);
  assert.equal(calls, 1);
  assert.equal(names.get(users[0].username), users[0].name);
});

test("channels are published when neither users nor groups have finished", () => {
  const channel = { id: "C1", name: "ops" };
  assert.deepEqual(mergeDirectorySearchResults(undefined, [[channel], []]), [[], [channel], []]);
});

test("empty query results include a visited channel from a later page", async () => {
  const teamId = "T1";
  const laterChannel = { id: "C-later", name: "frequently-used", internal_team_ids: [teamId] };
  let pages = 0;
  const [channels] = await searchConversationDirectory({
    query: "",
    maxResultsPerType: 100,
    loadConversationsPage: async () => {
      pages++;
      return pages === 1
        ? {
            items: Array.from({ length: 100 }, (_, i) => ({
              id: `C${i}`,
              name: `channel-${i}`,
              internal_team_ids: [teamId],
            })),
            nextCursor: "page-2",
          }
        : { items: [laterChannel] };
    },
  });

  assert.equal(pages, 1);
  assert.equal(
    channels.some((channel) => channel.id === laterChannel.id),
    false,
  );

  const visited = rememberVisitedDirectoryItem([], {
    id: laterChannel.id,
    name: laterChannel.name,
    teamId,
    icon: "channel-public.png",
  });
  const merged = mergeVisitedDirectoryItems(channels, visited, "");
  assert.ok(merged?.some((channel) => channel.id === laterChannel.id));
  assert.equal(
    mergeVisitedDirectoryItems(channels, visited, "frequently")?.some((channel) => channel.id === laterChannel.id),
    false,
  );
});
