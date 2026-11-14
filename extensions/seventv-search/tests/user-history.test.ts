import assert from "node:assert/strict";
import { test } from "node:test";
import { createUserHistoryStore } from "../src/user-history.ts";
const user = (id: string) => ({ id, name: id, handle: id, platform: "TWITCH" });
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key),
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
test("recent users persist per command, deduplicate, and support remove and clear", async () => {
  const db = storage();
  const channel = createUserHistoryStore(db, "channel");
  const creator = createUserHistoryStore(db, "creator");
  await Promise.all([channel.record(user("a")), channel.record(user("b"))]);
  assert.deepEqual(
    (await channel.record({ ...user("a"), name: "updated" })).map((u) => u.id),
    ["a", "b"],
  );
  assert.deepEqual(await creator.load(), []);
  assert.equal(
    (await createUserHistoryStore(db, "channel").load())[0].name,
    "updated",
  );
  assert.deepEqual(
    (await channel.remove("a")).map((u) => u.id),
    ["b"],
  );
  assert.deepEqual(await channel.clear(), []);
});
test("recent users wait for installed data and retain only twenty entries", async () => {
  const db = storage();
  db.data.set("recent_users_channel_v1", JSON.stringify([user("old")]));
  const store = createUserHistoryStore(db, "channel");
  assert.deepEqual(
    (await store.record(user("new"))).map((u) => u.id),
    ["new", "old"],
  );
  for (let i = 0; i < 25; i++) await store.record(user(String(i)));
  const users = await store.load();
  assert.equal(users.length, 20);
  assert.equal(users[0].id, "24");
});
test("unreadable recent users are never overwritten", async () => {
  const db = storage();
  db.data.set("recent_users_creator_v1", "broken");
  const store = createUserHistoryStore(db, "creator");
  await assert.rejects(store.record(user("a")));
  await assert.rejects(store.clear());
  assert.equal(db.data.get("recent_users_creator_v1"), "broken");
});
