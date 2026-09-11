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

/**
 * The deadline Keysi publishes with the file. It only rewrites this while
 * it runs — and it is a menu-bar agent people leave quit for weeks — so
 * without honouring `proUntil` a trial that lapsed in the meantime reads as
 * unlocked forever, to the one command the app never gets asked about.
 */
test("a deadline in the future stays unlocked", () => {
  const later = new Date(Date.now() + 86_400_000).toISOString();
  assert.deepEqual(readTier(fileWith(`{"unlocked":true,"proUntil":"${later}"}`)), {
    unlocked: true,
    known: true,
  });
});

test("a deadline that has passed locks, and knows Keysi has run", () => {
  const earlier = new Date(Date.now() - 1000).toISOString();
  assert.deepEqual(readTier(fileWith(`{"unlocked":true,"proUntil":"${earlier}"}`)), {
    unlocked: false,
    known: true,
  });
});

/** The boundary itself is expiry, matching `AccessManager.computeLevel`. */
test("the deadline instant is expired, not the last unlocked moment", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const path = fileWith('{"unlocked":true,"proUntil":"2026-01-01T00:00:00.000Z"}');
  assert.equal(readTier(path, now).unlocked, false);
  assert.equal(readTier(path, new Date(now.getTime() - 1)).unlocked, true);
});

/** A perpetual license genuinely has no deadline; Keysi omits the key. */
test("no deadline means no expiry", () => {
  assert.equal(readTier(fileWith('{"unlocked":true,"tier":"pro"}')).unlocked, true);
});

/**
 * Locking a paying customer out over a malformed date would be the worse
 * mistake, and everything with teeth is still enforced inside the app.
 */
test("an unparseable deadline is ignored rather than treated as expired", () => {
  for (const value of ['"soon"', "123", "null", "{}"]) {
    assert.equal(readTier(fileWith(`{"unlocked":true,"proUntil":${value}}`)).unlocked, true, `value ${value}`);
  }
});
