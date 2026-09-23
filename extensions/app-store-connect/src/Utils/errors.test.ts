/**
 * Run with: node --experimental-strip-types src/Utils/errors.test.ts
 */
import assert from "node:assert";
import { presentableApiError } from "./errors.ts";

// The reported bug: Apple sends the same sentence as title and detail, and the toast
// rendered it twice.
const dupe = "The build is not in a valid processing state for this operation.";
const mapped = presentableApiError(dupe, dupe);
assert.notStrictEqual(mapped.title, mapped.message, "title and message must not be identical");
// Not "wait for processing" — that wording also covers invalid/expired/failed builds.
assert.strictEqual(mapped.title, "Build Can't Be Used Here");
assert.match(mapped.message, /still be processing, or it may have expired/);

// A repeat that differs only by trailing punctuation or case is still a repeat.
const r1 = presentableApiError("Something broke", "Something broke.");
assert.strictEqual(r1.message, "", "punctuation-only repeat must collapse");
const r2 = presentableApiError("Something broke", "something broke");
assert.strictEqual(r2.message, "", "case-only repeat must collapse");
const r3 = presentableApiError("Something broke", "");
assert.strictEqual(r3.message, "", "empty detail must collapse");

// Genuinely different detail is preserved.
const distinct = presentableApiError("Conflict", "A tester with that email is already in the group.");
assert.strictEqual(distinct.title, "Conflict");
assert.strictEqual(distinct.message, "A tester with that email is already in the group.");

// Known errors are rewritten into something actionable regardless of which field matches.
assert.strictEqual(presentableApiError("Forbidden", "You are not authorized").title, "Not Permitted");
assert.strictEqual(presentableApiError("429", "Rate limit exceeded").title, "Rate Limited");
assert.strictEqual(presentableApiError("Not Found", "does not exist").title, "Not Found");

// ORDER: Apple's combined existence-or-permission wording must resolve to the permission
// advice. Answering "reload the list" when the fix is to obtain access is wrong advice.
const combined = presentableApiError("Conflict", "The resource does not exist or you are not authorized to access it.");
assert.strictEqual(combined.title, "Not Permitted", "permission must win over not-found");

// A build that is INVALID/expired must NOT be told to wait for processing to finish.
const invalidBuild = presentableApiError(
  "Conflict",
  "The build is not in a valid processing state for this operation.",
);
assert.notStrictEqual(invalidBuild.title, "Build Isn't Ready Yet", "generic state wording must not promise waiting");
assert.match(invalidBuild.message, /expired or failed/, "must name the other possible causes");

// A genuinely still-processing build keeps the actionable advice.
assert.strictEqual(presentableApiError("Conflict", "The build is still processing.").title, "Build Isn't Ready Yet");

// An attribute-level duplicate must not be told "nothing was changed" — the user has to
// change the conflicting value.
const dupAttr = presentableApiError("Conflict", "A build with that version already exists.");
assert.strictEqual(dupAttr.title, "Already Exists");
assert.doesNotMatch(dupAttr.message, /nothing was changed/i, "must not claim no action is needed");

// An unknown error is passed through rather than swallowed by a generic message.
const unknown = presentableApiError("Teapot", "Server refused to brew coffee");
assert.strictEqual(unknown.title, "Teapot");
assert.strictEqual(unknown.message, "Server refused to brew coffee");

console.log("errors: all assertions passed.");
