import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeRegExp, queryWords } from "../src/words";

test("a query's words are its runs of letters and digits, lowercased, each once", () => {
  assert.deepEqual(queryWords("The clause about PETS, pets & INV-48213!"), ["the", "clause", "about", "pets", "inv", "48213"]);
  assert.deepEqual(queryWords("海滩上的狗 café"), ["海滩上的狗", "café"]);
  assert.deepEqual(queryWords("  ...  "), []);
});

test("text is made safe to put in a regular expression", () => {
  assert.equal(new RegExp(escapeRegExp("a.b*(c)[d]")).test("a.b*(c)[d]"), true);
  assert.equal(new RegExp(escapeRegExp("a.b")).test("axb"), false);
});
