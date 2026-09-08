import assert from "node:assert/strict";
import test from "node:test";
import { createDirectoryUserSearch, mergeDirectorySearchResults } from "./directory";

test("member rows and group names share one user lookup per query", async () => {
  let calls = 0;
  const search = createDirectoryUserSearch(async () => {
    calls++;
    return [{ username: "alice", name: "Alice Smith" }];
  });
  const [users, names] = await Promise.all([search.getUsers(), search.getUserNames()]);
  assert.equal(calls, 1);
  assert.equal(names.get(users[0].username), users[0].name);
});

test("channels are published when neither users nor groups have finished", () => {
  const channel = { id: "C1", name: "ops" };
  assert.deepEqual(mergeDirectorySearchResults(undefined, [[channel], []]), [[], [channel], []]);
});
