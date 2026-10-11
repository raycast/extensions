import assert from "node:assert/strict";
import { test } from "node:test";
import type { Gear } from "../src/catalog";
import { rememberGear, RECENTS_LIMIT } from "../src/recents";

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
