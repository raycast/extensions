import test from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/lib/slug";

test("slugify removes diacritics and punctuation", () => {
  assert.equal(slugify("Crème brûlée: a test!"), "creme-brulee-a-test");
});

test("slugify trims and bounds output", () => {
  const long = "a".repeat(500);
  assert.equal(slugify(long).length <= 120, true);
});
