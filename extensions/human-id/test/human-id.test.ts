import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_WORDS, MIN_WORDS, humanId } from "../src/human-id";
import { adjectives, adverbs, nouns, verbs } from "../src/words";

test("word lists have the exact power-of-two sizes the masks assume", () => {
  assert.equal(adjectives.length, 512);
  assert.equal(nouns.length, 512);
  assert.equal(verbs.length, 256);
  assert.equal(adverbs.length, 128);
});

test("words are unique, lowercase a-z only", () => {
  for (const list of [adjectives, nouns, verbs, adverbs]) {
    assert.equal(new Set(list).size, list.length);
    for (const word of list) assert.match(word, /^[a-z]+$/);
  }
});

test("generates kebab-case IDs with the requested word count", () => {
  for (let n = MIN_WORDS; n <= MAX_WORDS; n++) {
    for (let i = 0; i < 1000; i++) {
      const id = humanId(n);
      assert.match(id, /^[a-z]+(-[a-z]+)*$/);
      assert.equal(id.split("-").length, n);
    }
  }
});

test("each slot can produce every word in its list", () => {
  const seen = [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()];
  for (let i = 0; i < 200_000; i++)
    humanId(5)
      .split("-")
      .forEach((w, j) => seen[j].add(w));
  assert.deepEqual(
    seen.map((s) => s.size),
    [512, 512, 512, 256, 128],
  );
});

test("rejects out-of-range word counts", () => {
  assert.throws(() => humanId(MIN_WORDS - 1), RangeError);
  assert.throws(() => humanId(MAX_WORDS + 1), RangeError);
});

test("no collisions across 1M default IDs", () => {
  const ids = new Set<string>();
  for (let i = 0; i < 1_000_000; i++) ids.add(humanId());
  // Birthday bound for 1M draws from 2^33 is ~58 expected collisions, so allow a few dozen.
  assert.ok(1_000_000 - ids.size < 150, `${1_000_000 - ids.size} collisions`);
});
