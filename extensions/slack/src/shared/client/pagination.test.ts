import assert from "node:assert/strict";
import test from "node:test";
import { collectPaginatedResults, matchesAllWords, matchesVisibleName } from "./pagination";

type Person = { name: string; title: string };
const hiddenMatches = Array.from({ length: 100 }, (_, i) => ({ name: `Person ${i}`, title: "Alice project" }));
const alice = { name: "Alice Smith", title: "Engineer" };

for (const laterPage of [true, false]) {
  test(`visible names replace a full retained result set on ${laterPage ? "later pages" : "the same page"}`, async () => {
    const cursors: Array<string | undefined> = [];
    const users = await collectPaginatedResults<Person, Person>({
      loadPage: async (cursor) => {
        cursors.push(cursor);
        return laterPage
          ? cursor
            ? { items: [alice] }
            : { items: hiddenMatches, nextCursor: "next" }
          : { items: [...hiddenMatches, alice] };
      },
      transform: (user) => user,
      matches: (user) => matchesAllWords([user.name, user.title], "Alice"),
      prioritize: (user) => matchesVisibleName(user.name, "Alice"),
      stopAfterPage: (users) => users.some((user) => matchesVisibleName(user.name, "Alice")),
      maxResults: 100,
      scanAllPages: true,
    });
    assert.equal(users.length, 100);
    assert.ok(users.includes(alice));
    assert.equal(cursors.length, laterPage ? 2 : 1);
  });
}

test("hidden matches stay bounded while scanning empty and nonmatching pages", async () => {
  let pages = 0;
  const users = await collectPaginatedResults({
    loadPage: async () => ({
      items: ++pages === 2 ? [] : hiddenMatches,
      nextCursor: pages < 4 ? String(pages) : undefined,
    }),
    transform: (user) => user,
    matches: () => true,
    prioritize: () => false,
    maxResults: 100,
    scanAllPages: true,
  });
  assert.equal(users.length, 100);
  assert.equal(pages, 4);
});

test("an aborted priority scan does not request another page", async () => {
  const controller = new AbortController();
  let pages = 0;
  await assert.rejects(
    collectPaginatedResults({
      loadPage: async () => {
        pages++;
        controller.abort();
        return { items: hiddenMatches, nextCursor: "next" };
      },
      transform: (user) => user,
      matches: () => true,
      prioritize: () => false,
      maxResults: 100,
      scanAllPages: true,
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );
  assert.equal(pages, 1);
});

test("a visible match after the cap on the same page stops further requests", async () => {
  let pages = 0;
  await collectPaginatedResults({
    loadPage: async () => {
      assert.equal(++pages, 1);
      return { items: [...hiddenMatches, alice], nextCursor: "must-not-load" };
    },
    transform: (user) => user,
    matches: () => true,
    prioritize: (user) => matchesVisibleName(user.name, "Alice"),
    stopAfterPage: (users) => users.some((user) => matchesVisibleName(user.name, "Alice")),
    maxResults: 100,
    scanAllPages: true,
  });
  assert.equal(pages, 1);
});
