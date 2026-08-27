/**
 * Run with: node --experimental-strip-types src/Utils/credentials.test.ts
 *
 * Guards the rollback path in AddTeam. The reported defect: a newly added credential
 * sharing a Key ID with an existing one gets a 401, and the rollback deletes BOTH —
 * destroying the credential that was working.
 */
import assert from "node:assert";
import { isSameCredential, removeOneCredential, type StoredCredential } from "./credentials.ts";

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
