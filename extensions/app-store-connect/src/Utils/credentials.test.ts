/**
 * Run with: node --experimental-strip-types src/Utils/credentials.test.ts
 *
 * Guards the rollback path in AddTeam. The reported defect: a newly added credential
 * sharing a Key ID with an existing one gets a 401, and the rollback deletes BOTH —
 * destroying the credential that was working.
 */
import assert from "node:assert";
import {
  credentialCacheKey,
  isSameCredential,
  isUnnamed,
  keyDisplayName,
  locateCredential,
  removeOneCredential,
  type StoredCredential,
} from "./credentials.ts";

const working: StoredCredential = {
  name: "Team Key",
  issuerID: "69a6de00-1111-2222-3333-444455556666",
  apiKey: "ABC123",
  privateKey: "PEM-A",
};

// Same Key ID, wrong Issuer ID — the realistic way a duplicate Key ID appears: the user
// re-adds the key after mistyping the issuer, rather than deleting the old entry first.
const rejected: StoredCredential = { ...working, name: "Team Key (retry)", issuerID: "wrong-issuer" };

// THE REPORTED BUG: rolling back the rejected key must not take the working one with it.
{
  const stored = [working, rejected];
  const { removed, remaining } = removeOneCredential(stored, rejected);
  assert.strictEqual(removed, true, "the rejected credential must be removed");
  assert.strictEqual(remaining.length, 1, "exactly one entry may be removed");
  assert.deepStrictEqual(remaining[0], working, "the working credential must survive");
}

// Key ID alone is not identity — the whole point.
assert.strictEqual(isSameCredential(working, rejected), false, "same Key ID, different issuer => different");
assert.strictEqual(isSameCredential(working, { ...working }), true, "same content => same");
assert.strictEqual(isSameCredential(working, { ...working, name: "Renamed" }), false, "name is part of identity");
assert.strictEqual(isSameCredential(working, { ...working, privateKey: "PEM-B" }), false, "key material matters");

// An individual key has no issuerID; undefined must not collide with a real issuer.
const individual: StoredCredential = { name: "Individual", apiKey: "ABC123", privateKey: "PEM-A" };
assert.strictEqual(isSameCredential(individual, working), false, "absent issuerID != present issuerID");
{
  const { remaining } = removeOneCredential([working, individual], individual);
  assert.deepStrictEqual(remaining, [working], "removing the individual key leaves the team key");
}

// Byte-identical duplicates: remove one, keep one. Content is the same either way, so the
// selection stays valid — which is what the caller's "does anything still match?" relies on.
{
  const { removed, remaining } = removeOneCredential([working, { ...working }], working);
  assert.strictEqual(removed, true);
  assert.strictEqual(remaining.length, 1, "only one of two identical entries is removed");
  assert.ok(
    remaining.some((c) => isSameCredential(c, working)),
    "a matching credential still backs the selection",
  );
}

// Nothing matched => storage is left untouched rather than rewritten.
{
  const stored = [working];
  const { removed, remaining } = removeOneCredential(stored, { ...working, apiKey: "NOPE" });
  assert.strictEqual(removed, false);
  assert.strictEqual(remaining, stored, "the original array is returned unchanged");
}

// Empty-string issuerID must never be a second way of saying "individual key": the
// selection keys treat "" as absent, so identity has to agree or a record can be dropped
// from the list while the flat selection still points at it. Normalization happens at the
// schema boundary; this pins the rule identity depends on.
{
  const normalized: StoredCredential = { ...individual };
  const rawEmpty = { ...individual, issuerID: "" } as StoredCredential;
  assert.strictEqual(
    isSameCredential(normalized, rawEmpty),
    false,
    'un-normalized "" differs from undefined — hence the schema transform',
  );
}

// Removing one of two credentials that differ ONLY by name.
{
  const renamed: StoredCredential = { ...working, name: "Same key, other label" };
  const { remaining } = removeOneCredential([working, renamed], renamed);
  assert.deepStrictEqual(remaining, [working], "name alone is enough to tell them apart");
}

console.log("credentials: all assertions passed.");

// --- Cache partitioning ---------------------------------------------------
// Guards the reported defect: the API path alone was the whole cache key, so switching
// teams served the previous team's rows out of cache, and a failed refresh left them up.

// Two teams answering the same path must land in different buckets.
assert.notStrictEqual(
  credentialCacheKey("ABC123", "69a6de00-1111-2222-3333-444455556666"),
  credentialCacheKey("XYZ789", "aa11bb22-3333-4444-5555-666677778888"),
  "different accounts must not share a cache key",
);

// The individual/team split is what makes Key ID reuse safe here too.
assert.notStrictEqual(
  credentialCacheKey("ABC123", undefined),
  credentialCacheKey("ABC123", "69a6de00-1111-2222-3333-444455556666"),
  "same Key ID under an issuer and as an individual key are different accounts",
);

// Same account => same bucket, or the cache never hits at all.
assert.strictEqual(
  credentialCacheKey("ABC123", "69a6de00-1111-2222-3333-444455556666"),
  credentialCacheKey("ABC123", "69a6de00-1111-2222-3333-444455556666"),
  "the same credential must be stable across mounts",
);

// No credential => "", which the hook treats as "do not fetch and serve nothing".
assert.strictEqual(credentialCacheKey(undefined, "69a6de00-1111-2222-3333-444455556666"), "");
assert.strictEqual(credentialCacheKey("", undefined), "");

// Key material must never reach a persisted cache key.
{
  const key = credentialCacheKey(working.apiKey, working.issuerID);
  assert.ok(!key.includes(working.privateKey), "the private key must not appear in a cache key");
  assert.ok(!key.includes(working.name), "the local label must not appear in a cache key");
}

console.log("credentials: cache-key assertions passed.");

// --- Display naming -------------------------------------------------------
// The list groups by key type, so a name of "Team Key" would sit under a "Team Keys"
// heading. Names this extension generated in earlier versions are already in storage,
// so they have to be recognised rather than only avoided going forward.

const named = (name: string, apiKey = "AY75NK523NNX") => ({ name, apiKey });

assert.strictEqual(isUnnamed(named("")), true, "blank is unnamed");
assert.strictEqual(isUnnamed(named("   ")), true, "whitespace is unnamed");
assert.strictEqual(isUnnamed(named("Individual Key (AY75NK523NNX)")), true, "the generated label counts as unnamed");
assert.strictEqual(isUnnamed(named("Team Key (6N2J3UCSKL)", "6N2J3UCSKL")), true, "the older generated label too");

// Matched against THIS record's Key ID, so a Key ID outside [A-Z0-9] is still recognised
// (the old generator interpolated whatever it was given) ...
assert.strictEqual(isUnnamed(named("Team Key (abc-123)", "abc-123")), true, "generated names are not all uppercase");
// ... and a parenthetical naming someone ELSE's key is a name the person typed.
assert.strictEqual(
  isUnnamed(named("Team Key (6N2J3UCSKL)", "AY75NK523NNX")),
  false,
  "another key's ID is not this one",
);

// A name a person actually chose must survive, even when it contains the same words.
assert.strictEqual(isUnnamed(named("Tincan CI")), false);
assert.strictEqual(isUnnamed(named("My Team Key")), false, "a chosen name that merely ends in the label");
// No released version ever stored the bare form, so it stays available as a real name.
assert.strictEqual(isUnnamed(named("Team Key")), false, "a person may legitimately call a key this");
assert.strictEqual(isUnnamed(named("Individual Key")), false, "a person may legitimately call a key this");
assert.strictEqual(isUnnamed(named("Team Key for Coaster")), false, "a chosen name that begins with it");
assert.strictEqual(isUnnamed(named("Individual Key (personal)")), false, "prose in the parentheses is a real name");

// Display falls back to the Key ID, which is what distinguishes two unnamed rows.
assert.strictEqual(keyDisplayName({ name: "", apiKey: "ABC123" }), "ABC123");
assert.strictEqual(keyDisplayName({ name: "Individual Key (ABC123)", apiKey: "ABC123" }), "ABC123");
assert.strictEqual(keyDisplayName({ name: "  Tincan CI  ", apiKey: "ABC123" }), "Tincan CI", "trimmed");

console.log("credentials: naming assertions passed.");

// --- Locating the row a user acted on ---------------------------------------
// The reported failure: with two byte-identical keys stored, renaming the SECOND renamed
// the first, because identity alone always finds index 0.

{
  const duplicates = [working, { ...working }];
  assert.strictEqual(locateCredential(duplicates, working, 1), 1, "the clicked row, not the first match");
  assert.strictEqual(locateCredential(duplicates, working, 0), 0, "and the first row when that is the one");
}

// Position is only a hint: it comes from an earlier render, so it is verified first.
{
  const stored = [individual, working];
  assert.strictEqual(locateCredential(stored, working, 0), 1, "wrong position falls back to a search");
  assert.strictEqual(locateCredential(stored, working, 99), 1, "out of range falls back too");
  assert.strictEqual(locateCredential(stored, working, -1), 1, "negative falls back too");
}

// Gone entirely — removed by another command between render and action.
assert.strictEqual(locateCredential([individual], working, 0), -1, "absent credential reports -1");
assert.strictEqual(locateCredential([], working, 0), -1, "empty storage reports -1");

console.log("credentials: location assertions passed.");
