import assert from "node:assert/strict";
import { test } from "node:test";
import type { Gear } from "../src/catalog";
import {
  createRecentHistory,
  rememberGear,
  RECENTS_LIMIT,
} from "../src/recents";

const gear = (slug: string, price = 10000): Gear => ({
  slug,
  name: slug,
  gearType: "CAMERA",
  brandName: null,
  thumbnailUrl: null,
  estimatedUsedUsdCents: price,
});

test("recent opens move to the front, update metadata, deduplicate, and stay bounded", () => {
  const original = Array.from({ length: RECENTS_LIMIT }, (_, i) =>
    gear(String(i)),
  );
  const reopened = rememberGear(original, gear("5", 20000));
  assert.equal(reopened[0].slug, "5");
  assert.equal(reopened[0].estimatedUsedUsdCents, 20000);
  assert.equal(reopened.filter((item) => item.slug === "5").length, 1);
  assert.equal(original[0].slug, "0");
  const added = rememberGear(reopened, gear("new"));
  assert.equal(added.length, RECENTS_LIMIT);
  assert.equal(added[0].slug, "new");
  assert.equal(
    added.some((item) => item.slug === "9"),
    false,
  );
  assert.deepEqual(rememberGear([], gear("first")), [gear("first")]);
});

test("opens wait for initial history and serialize reads and writes", async () => {
  let release!: (items: Gear[]) => void;
  const initial = new Promise<Gear[]>((resolve) => {
    release = resolve;
  });
  let persisted = [gear("existing")];
  let reads = 0;
  const history = createRecentHistory(
    async () => (++reads === 1 ? initial : [...persisted]),
    async (items) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      persisted = items;
    },
  );
  const loading = history.load();
  const first = history.record(gear("first"));
  const second = history.record(gear("second"));
  await Promise.resolve();
  assert.deepEqual(
    persisted.map((item) => item.slug),
    ["existing"],
  );
  release(persisted);
  await Promise.all([loading, first, second]);
  assert.deepEqual(
    persisted.map((item) => item.slug),
    ["second", "first", "existing"],
  );
  assert.deepEqual(await history.load(), persisted);
});

test("a failed write does not block later history updates", async () => {
  let persisted = [gear("existing")];
  let fail = true;
  const history = createRecentHistory(
    async () => persisted,
    async (items) => {
      if (fail) {
        fail = false;
        throw new Error("write failed");
      }
      persisted = items;
    },
  );
  await assert.rejects(history.record(gear("failed")), /write failed/);
  await history.record(gear("success"));
  assert.deepEqual(
    persisted.map((item) => item.slug),
    ["success", "existing"],
  );
});
