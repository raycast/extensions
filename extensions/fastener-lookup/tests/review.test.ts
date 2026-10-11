import { test } from "node:test";
import assert from "node:assert/strict";
import { rowsForSize, search } from "../src/search";

const sizes = (q: string) => [...new Set(search(q).map((r) => r.size))];

// A value copied into CAD must be for the fastener the user asked about. When the query
// has leftovers the parser can't account for, show nothing rather than guess.

test("a typo after the size is refused, not silently dropped (#1O is not #1)", () => {
  assert.deepEqual(search("#1O"), []);
});

test("two sizes in one query are ambiguous and match nothing", () => {
  assert.deepEqual(search("#10 1/4"), []);
  assert.deepEqual(search("m6 m8"), []);
});

test("an unknown word is refused", () => {
  assert.deepEqual(search("#10 banana"), []);
});

test("natural filler words are still accepted", () => {
  assert.deepEqual(sizes("clearance for #10"), ["#10"]);
  assert.deepEqual(sizes("#10 close fit"), ["#10"]);
  assert.deepEqual(sizes("3/8 tap drill"), ["3/8"]);
  assert.deepEqual(sizes("tap drill for a 1/4-20 screw"), ["1/4"]);
  assert.deepEqual(sizes("m6 bolt clearance hole"), ["M6"]);
});

test("trailing punctuation does not invalidate a query", () => {
  assert.deepEqual(sizes("#10."), ["#10"]);
  assert.deepEqual(sizes("m6?"), ["M6"]);
});

test("the one-inch fastener is reachable by inch notation", () => {
  assert.deepEqual(sizes('1"'), ["1"]);
  assert.deepEqual(sizes("1 in"), ["1"]);
});

test("rowsForSize resolves an exact size without going through the query parser", () => {
  const inch = rowsForSize("1");
  assert.ok(inch.length > 0, "1-inch sheet must not be empty");
  assert.ok(
    inch.every((r) => r.size === "1"),
    "only 1-inch rows",
  );
  assert.ok(inch.some((r) => r.fastener === "1-8 UNC" && r.section === "Tap Drill"));
  assert.ok(inch.some((r) => r.section === "Counterbore"));
});

test("rowsForSize keeps #1 and 1-inch apart", () => {
  assert.ok(rowsForSize("#1").every((r) => r.size === "#1"));
  assert.ok(rowsForSize("#1").some((r) => r.fastener === "#1-64 UNC"));
});

test("rowsForSize covers metric and returns nothing for an unknown size", () => {
  assert.ok(rowsForSize("M6").some((r) => r.fastener === "M6x1.0"));
  assert.deepEqual(rowsForSize("M99"), []);
});
