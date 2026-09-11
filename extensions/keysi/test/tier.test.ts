import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTier } from "../src/lib/tier.ts";

const dir = mkdtempSync(join(tmpdir(), "keysi-tier-"));

function fileWith(contents: string): string {
  const path = join(dir, `${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(path, contents);
  return path;
}

test("an unlocked marker unlocks", () => {
  assert.deepEqual(readTier(fileWith('{"unlocked":true,"tier":"pro"}')), {
    unlocked: true,
    known: true,
  });
});

test("a locked marker stays locked but is known", () => {
  assert.deepEqual(readTier(fileWith('{"unlocked":false,"tier":"free"}')), {
    unlocked: false,
    known: true,
  });
});

/**
 * The two failure modes have to stay distinguishable: telling someone who
 * has never launched Keysi that they need to buy Pro sends them looking for
 * a purchase they might already own.
 */
test("a missing file is locked and unknown", () => {
  assert.deepEqual(readTier(join(dir, "nope.json")), { unlocked: false, known: false });
});

/**
 * A corrupt file means Keysi *has* run — so `known` stays true and the user
 * is shown the Pro screen rather than "install Keysi first". Flagged in
 * store review: collapsing this into `known: false` told someone who may
 * already own Pro to go and install the app. Still locked either way; an
 * unparseable tier file is not proof of anything.
 */
test("a corrupt file is locked but known, rather than throwing", () => {
  assert.deepEqual(readTier(fileWith("{not json")), { unlocked: false, known: true });
});

/** Anything other than exactly `true` must not unlock. */
test("truthy-but-not-true values do not unlock", () => {
  for (const value of ['"true"', "1", '"yes"', "null", "{}"]) {
    assert.equal(readTier(fileWith(`{"unlocked":${value}}`)).unlocked, false, `value ${value}`);
  }
});

test("a file with no unlocked key is locked", () => {
  assert.equal(readTier(fileWith('{"tier":"pro"}')).unlocked, false);
});
