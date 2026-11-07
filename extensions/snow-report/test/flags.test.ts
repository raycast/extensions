import assert from "node:assert/strict";
import { test } from "node:test";
import resorts from "../src/data/resorts.json";
import { flag } from "../src/lib/flags";

test("countries whose names were shared with retired codes", () => {
  assert.equal(flag("France"), "🇫🇷");
  assert.equal(flag("Serbia"), "🇷🇸");
  assert.equal(flag("Russia"), "🇷🇺");
  assert.equal(flag("United Kingdom"), "🇬🇧");
});

test("multi-country areas get a flag each, unknown names get none", () => {
  assert.equal(flag("Italy / Switzerland"), "🇮🇹🇨🇭");
  assert.equal(flag("Atlantis"), "");
});

test("every country in the resort data has a flag", () => {
  const countries = new Set(resorts.map((r) => r.country).filter(Boolean));
  // A flag is two regional-indicator symbols, so one per country in "A / B".
  const missing = [...countries].filter((c) => [...flag(c)].length !== 2 * c.split(" / ").length);
  assert.deepEqual(missing, []);
});
