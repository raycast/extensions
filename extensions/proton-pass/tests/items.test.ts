import assert from "node:assert/strict";
import test from "node:test";
import { createItems, getLoginIdentifier } from "../src/items/items";
import type { ItemCache } from "../src/items/item-cache";
import type { ItemDetails, ItemSummary } from "../src/items/item";

const item = (itemId: string, modifyTime = "1"): ItemSummary => ({ shareId: "share", itemId, vaultName: "Main", title: itemId, type: "login", modifyTime });
const details = (summary: ItemSummary): ItemDetails => ({ ...summary, type: "login", urls: [], hasTotp: true, username: `user-${summary.itemId}` });

function setup(initial?: ItemCache) {
  let stored = initial;
  const deleted: string[] = [];
  const source = {
    async listItems() { return [item("one")]; },
    async viewItem(summary: ItemSummary) { if (summary.itemId === "broken") throw new Error("broken"); return details(summary); },
    async createLogin() { return item("created"); },
    async deleteItem(reference: { itemId: string }) { deleted.push(reference.itemId); },
    async readField(_reference: unknown, field: string) { return field; },
  };
  const cache = { async read() { return stored; }, async write(value: ItemCache) { stored = value; } };
  return { items: createItems(source, cache), get stored() { return stored; }, deleted };
}

test("refresh stores fresh summaries while preserving metadata", async () => {
  const context = setup({ items: [], metadata: { old: { urls: [], hasTotp: false } } });
  const result = await context.items.refresh([{ name: "Main", shareId: "share" }]);
  assert.equal(result.items[0].itemId, "one");
  assert.deepEqual(result.metadata, { old: { urls: [], hasTotp: false } });
  assert.deepEqual(context.stored, result);
});

test("refresh starts with empty metadata when no cache exists", async () => {
  assert.deepEqual((await setup().items.refresh([])).metadata, {});
});

test("delegates view, create and field reads to the source", async () => {
  const { items } = setup();
  assert.equal((await items.view(item("one"))).username, "user-one");
  assert.equal((await items.createLogin({ shareId: "share", title: "New" })).itemId, "created");
  assert.equal(await items.readField(item("one"), "password"), "password");
});

test("removes an item and its metadata from cache", async () => {
  const context = setup({ items: [item("one"), item("two")], metadata: { "share:one": { urls: [], hasTotp: false }, "share:two": { urls: [], hasTotp: false } } });
  await context.items.remove(item("one"));
  assert.deepEqual(context.deleted, ["one"]);
  assert.deepEqual(context.stored?.items.map(({ itemId }) => itemId), ["two"]);
  assert.deepEqual(Object.keys(context.stored?.metadata ?? {}), ["share:two"]);
});

test("removal succeeds when there is no cache", async () => {
  const context = setup();
  await context.items.remove(item("one"));
  assert.deepEqual(context.deleted, ["one"]);
});

test("hydrates stale metadata in batches and tolerates individual failures", async () => {
  const summaries = Array.from({ length: 7 }, (_, index) => item(String(index))).concat(item("broken"));
  const context = setup({ items: summaries, metadata: { "share:0": { urls: [], hasTotp: false, modifyTime: "1" } } });
  const metadata = await context.items.hydrate(summaries);
  assert.equal(metadata["share:0"].hasTotp, false);
  assert.equal(metadata["share:6"].username, "user-6");
  assert.equal(metadata["share:broken"], undefined);
});

test("hydrates into a new cache when none exists", async () => {
  const context = setup();
  assert.equal((await context.items.hydrate([item("one")]))["share:one"].hasTotp, true);
});

test("selects login identifiers by username then email", () => {
  const base = { shareId: "s", itemId: "i", title: "T", urls: [], hasTotp: false };
  assert.equal(getLoginIdentifier({ ...base, type: "login", username: " user ", email: "mail" }), "user");
  assert.equal(getLoginIdentifier({ ...base, type: "login", username: "", email: " mail " }), "mail");
  assert.equal(getLoginIdentifier({ ...base, type: "alias", email: " alias " }), "alias");
  assert.equal(getLoginIdentifier({ ...base, type: "alias" }), undefined);
});
