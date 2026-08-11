import assert from "node:assert/strict";
import test from "node:test";
import { createItemActivityStore } from "../src/activity/item-activity";
import { createItemCache, metadataFrom } from "../src/items/item-cache";

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { async getItem<T>(key: string) { return values.get(key) as T | undefined; }, async setItem(key: string, value: string | number | boolean) { values.set(key, String(value)); }, values };
}
const reference = { shareId: "s", itemId: "i" };

test("item cache reads, writes and ignores invalid storage", async () => {
  const storage = memory(); const cache = createItemCache(storage);
  assert.equal(await cache.read(), undefined);
  await cache.write({ items: [], metadata: {} });
  assert.deepEqual(await cache.read(), { items: [], metadata: {} });
  storage.values.set("items.cache", "invalid");
  assert.equal(await cache.read(), undefined);
});

test("metadata allowlists fields for login and alias details", () => {
  const base = { ...reference, title: "Title", note: "secret note" };
  assert.deepEqual(metadataFrom({ ...base, type: "login", username: "u", email: "e", password: "secret", urls: ["url"], hasTotp: true }, "2"), { username: "u", email: "e", urls: ["url"], hasTotp: true, modifyTime: "2" });
  assert.deepEqual(metadataFrom({ ...base, type: "alias", email: "a", urls: [], hasTotp: false }), { username: undefined, email: "a", urls: [], hasTotp: false, modifyTime: undefined });
});

test("activity toggles pins, records use, prunes and removes", async () => {
  const storage = memory(); const activity = createItemActivityStore(storage);
  assert.deepEqual(await activity.getAll(), {});
  assert.equal((await activity.togglePin(reference)).pinned, true);
  assert.equal((await activity.togglePin(reference)).pinned, false);
  const used = await activity.markUsed(reference);
  assert.equal(typeof used.lastUsedAt, "number");
  await activity.togglePin({ shareId: "s", itemId: "other" });
  await activity.prune([reference]);
  assert.deepEqual(Object.keys(await activity.getAll()), ["s:i"]);
  await activity.remove(reference);
  assert.deepEqual(await activity.getAll(), {});
});

test("activity preserves a pin on use and ignores invalid storage", async () => {
  const storage = memory({ "item-activity": "invalid" }); const activity = createItemActivityStore(storage);
  assert.deepEqual(await activity.getAll(), {});
  await activity.togglePin(reference);
  assert.equal((await activity.markUsed(reference)).pinned, true);
});
