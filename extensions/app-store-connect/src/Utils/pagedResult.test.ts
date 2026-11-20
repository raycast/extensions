/**
 * Run with: node --experimental-strip-types src/Utils/pagedResult.test.ts
 *
 * Guards the box/unbox round-trip behind the paginated hook. The regression that
 * prompted this: a cached collection was restored on first render and unboxed as if it
 * were a single result, so a list of apps arrived as one app object.
 */
import assert from "node:assert";
import { boxPagedResult, unboxPagedResult } from "./pagedResult.ts";

const app = (id: string) => ({ type: "apps", id });

// A collection survives as a collection.
const many = [app("1"), app("2"), app("3")];
assert.deepStrictEqual(unboxPagedResult(boxPagedResult(many)), many, "collection must round-trip");

// A ONE-element collection is still a collection — the ambiguous case the marker exists for.
const one = [app("1")];
assert.deepStrictEqual(unboxPagedResult(boxPagedResult(one)), one, "one-element collection must stay an array");
assert.ok(Array.isArray(unboxPagedResult(boxPagedResult(one))), "must not be unboxed to the element");

// A single resource unboxes back to the object.
const single = { type: "users", id: "u1" };
assert.deepStrictEqual(unboxPagedResult(boxPagedResult(single)), single, "single must round-trip");

// null / undefined from a failed safeParse must not throw or become an array.
assert.strictEqual(unboxPagedResult(boxPagedResult(null)), null);
assert.strictEqual(unboxPagedResult(boxPagedResult(undefined)), undefined);

// THE REGRESSION: the cache serializes to JSON and restores before the fetcher runs.
// Boxing must survive that, because nothing set inside the fetcher is available yet.
const throughCache = <T>(value: T): T => JSON.parse(JSON.stringify(value));
assert.deepStrictEqual(unboxPagedResult(throughCache(boxPagedResult(many))), many, "cached collection stays a list");
assert.ok(Array.isArray(unboxPagedResult(throughCache(boxPagedResult(one)))), "cached 1-item list stays a list");
assert.deepStrictEqual(unboxPagedResult(throughCache(boxPagedResult(single))), single, "cached single unboxes");

// `undefined` is the riskiest value through the cache: JSON.stringify DROPS the key
// entirely, so the restored box has no `value` at all. Reading the missing key still
// yields undefined, but that must be asserted rather than assumed.
assert.strictEqual(unboxPagedResult(throughCache(boxPagedResult(undefined))), undefined, "cached undefined survives");
assert.strictEqual(unboxPagedResult(throughCache(boxPagedResult(null))), null, "cached null survives");

// Accumulated pages concatenate into one collection.
const pageOne = boxPagedResult([app("1"), app("2")]);
const pageTwo = boxPagedResult([app("3")]);
assert.deepStrictEqual(unboxPagedResult([...pageOne, ...pageTwo]), [app("1"), app("2"), app("3")]);

console.log("pagedResult: all assertions passed.");
