import assert from "node:assert/strict";
import { test } from "node:test";
import { randomMountain } from "../src/lib/mountain";

test("the same resort always gets the same mountain", () => {
  assert.deepEqual(randomMountain("Whistler Blackcomb|Canada"), randomMountain("Whistler Blackcomb|Canada"));
});

test("different resorts get different mountains", () => {
  assert.notDeepEqual(
    randomMountain("Whistler Blackcomb|Canada").profile,
    randomMountain("Zermatt|Switzerland").profile,
  );
});

test("the skyline has the requested resolution and stays in range", () => {
  const { profile, ridges } = randomMountain("Niseko United|Japan", 64);
  assert.equal(profile.length, 64);
  for (const h of [...profile, ...ridges.flat()]) assert.ok(h >= 0 && h <= 1.0001, `height ${h} out of range`);
});
