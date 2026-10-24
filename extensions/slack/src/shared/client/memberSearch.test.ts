import assert from "node:assert/strict";
import test from "node:test";
import { MemberDirectoryScanError, searchMemberDirectory } from "./memberSearch";
import { searchConversationDirectory, searchUserNames } from "./conversationSearch";
import { createDirectoryUserSearch } from "./directory";
import type { SlackMember } from "./slackTypes";

const alice: SlackMember = { id: "U1", name: "asmith", profile: { real_name: "Alice Smith" } };
const bob: SlackMember = { id: "U2", name: "bjones", profile: { real_name: "Bob Jones" } };
const loadPage = async (cursor?: string) => (cursor ? { items: [bob] } : { items: [alice], nextCursor: "bob" });
const loadConversationsPage = async () => ({
  items: [{ id: "G1", name: "mpdm-asmith--bjones-1", is_mpim: true, internal_team_ids: ["T1"] }],
});

for (const shared of [false, true]) {
  test(`matches query words across participants using ${shared ? "shared" : "standalone"} name enrichment`, async () => {
    const search = createDirectoryUserSearch(() =>
      searchMemberDirectory({
        query: "Alice Bob",
        maxResults: 100,
        loadPage,
        toUser: (member) => member,
      }),
    );
    const [, groups] = await searchConversationDirectory({
      query: "Alice Bob",
      maxResultsPerType: 100,
      types: "groups",
      loadConversationsPage,
      loadUserNames: shared
        ? search.getUserNames
        : () => searchUserNames({ query: "Alice Bob", maxResults: 100, loadPage }),
    });
    assert.equal(groups.length, 1);
    assert.equal(groups[0].name, "Alice Smith, Bob Jones");
    if (shared) assert.deepEqual(await search.getUsers(), [], "Individual user rows must still match the whole query");
  });
}

test("a full Alice bucket does not prevent retaining Bob on a later page", async () => {
  let pages = 0;
  const result = await searchMemberDirectory({
    query: "Alice Bob",
    maxResults: 100,
    loadPage: async () =>
      ++pages === 1
        ? {
            items: Array.from({ length: 150 }, (_, i) => ({
              id: `UA${i}`,
              name: `alice${i}`,
              profile: { real_name: `Alice ${i}` },
            })),
            nextCursor: "bob",
          }
        : { items: [bob] },
  });
  assert.equal(pages, 2);
  assert.equal(result.userNames.size, 101);
  assert.equal(result.userNames.get("bjones"), "Bob Jones");
});

test("per-word retention is capped and duplicate words do not allocate extra buckets", async () => {
  const result = await searchMemberDirectory({
    query: "Alice ALICE Bob",
    maxResults: 2,
    loadPage: async () => ({
      items: [
        alice,
        bob,
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `U${i}`,
          name: `extra${i}`,
          profile: { real_name: i % 2 ? `Alice ${i}` : `Bob ${i}` },
        })),
      ],
    }),
  });
  assert.equal(result.userNames.size, 4);
});

test("a partial participant match does not pass the final group filter", async () => {
  const [, groups] = await searchConversationDirectory({
    query: "Alice Charlie",
    maxResultsPerType: 100,
    loadConversationsPage,
    loadUserNames: () => searchUserNames({ query: "Alice Charlie", maxResults: 100, loadPage }),
  });
  assert.equal(groups.length, 0);
});

test("shared member scan stops on cancellation without requesting another page", async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    searchMemberDirectory({
      query: "Alice Bob",
      maxResults: 100,
      signal: controller.signal,
      loadPage: async () => {
        calls++;
        controller.abort();
        return { items: [alice], nextCursor: "next" };
      },
    }),
    { name: "AbortError" },
  );
  assert.equal(calls, 1);
});

test("empty shared searches keep names from the initial user page without scanning the directory", async () => {
  let calls = 0;
  const result = await searchMemberDirectory({
    query: "",
    maxResults: 100,
    toUser: (member) => member,
    loadPage: async () => {
      calls++;
      return { items: [alice, bob], nextCursor: "next" };
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.users.length, 2);
  assert.equal(result.userNames.get("asmith"), "Alice Smith");
});

test("a later page failure keeps matches already found and reports the scan error", async () => {
  const failure = new Error("users.list failed");
  await assert.rejects(
    searchMemberDirectory({
      query: "Alice",
      maxResults: 100,
      toUser: (member) => member,
      loadPage: async (cursor) => {
        if (cursor) throw failure;
        return { items: [alice], nextCursor: "bob" };
      },
    }),
    (error) => {
      assert.ok(error instanceof MemberDirectoryScanError);
      assert.equal(error.failure, failure);
      assert.deepEqual(
        error.partial.users.map((user) => user.name),
        ["asmith"],
      );
      assert.equal(error.partial.userNames.get("asmith"), "Alice Smith");
      assert.equal(error.partial.userNames.has("bjones"), false);
      return true;
    },
  );
});

test("a page that reports a scan error keeps the matches on that page", async () => {
  const failure = new Error("users.list failed");
  await assert.rejects(
    searchMemberDirectory({
      query: "Alice",
      maxResults: 100,
      toUser: (member) => member,
      loadPage: async () => ({ items: [alice], error: failure }),
    }),
    (error) => {
      assert.ok(error instanceof MemberDirectoryScanError);
      assert.equal(error.failure, failure);
      assert.equal(error.partial.users[0]?.id, "U1");
      return true;
    },
  );
});

test("a failure before any member page is the original error", async () => {
  const failure = new Error("users.list failed");
  await assert.rejects(
    searchMemberDirectory({
      query: "Alice",
      maxResults: 100,
      loadPage: async () => {
        throw failure;
      },
    }),
    (error) => error === failure,
  );
});

test("reports matches from a fetched page before the next page finishes", async () => {
  let releaseNext: () => void = () => undefined;
  const nextPage = new Promise<void>((resolve) => {
    releaseNext = resolve;
  });
  let secondFinished = false;
  let reported: () => void = () => undefined;
  const firstPage = new Promise<void>((resolve) => {
    reported = resolve;
  });
  const pending = searchMemberDirectory({
    query: "Alice",
    maxResults: 100,
    toUser: (member) => member,
    onProgress: (partial) => {
      if (partial.users.some((user) => user.id === "U1")) reported();
    },
    loadPage: async (cursor) => {
      if (!cursor) return { items: [alice], nextCursor: "next" };
      await nextPage;
      secondFinished = true;
      return { items: [] };
    },
  });
  try {
    const winner = await Promise.race([
      firstPage.then(() => "reported" as const),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 50)),
    ]);
    assert.equal(winner, "reported");
    assert.equal(secondFinished, false);
  } finally {
    releaseNext();
  }
  await pending;
});

test("a full preferred page does not wait for later pages", async () => {
  let calls = 0;
  const result = await searchMemberDirectory({
    query: "Alice",
    maxResults: 1,
    toUser: (member) => member,
    loadPage: async () => {
      calls += 1;
      return { items: [alice], nextCursor: "next" };
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.users[0]?.id, "U1");
});

test("shared scan keeps later visible user matches and stops at the preferred limit", async () => {
  let calls = 0;
  const result = await searchMemberDirectory({
    query: "Alice",
    maxResults: 2,
    toUser: (member) => member,
    loadPage: async () => {
      calls++;
      assert.ok(calls <= 2);
      return {
        items: calls === 1 ? [alice] : [{ id: "U3", name: "ajohnson", profile: { real_name: "Alice Johnson" } }],
        nextCursor: "next",
      };
    },
  });
  assert.equal(calls, 2);
  assert.deepEqual(
    result.users.map((user) => user.name),
    ["asmith", "ajohnson"],
  );
});
