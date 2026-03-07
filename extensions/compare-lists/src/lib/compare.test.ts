import assert from "node:assert/strict";
import test from "node:test";

import { buildSummaryText, compareLists, formatDifference, parseList } from "./compare";

test("matches items case-insensitively when the checkbox is off", () => {
  const result = compareLists("Apple", "apple", false);

  assert.equal(result.inBothCount, 1);
  assert.deepEqual(result.inBoth, ["Apple"]);
  assert.deepEqual(result.onlyInA, []);
  assert.deepEqual(result.onlyInB, []);
});

test("treats case variants as different items when case-sensitive", () => {
  const result = compareLists("Apple", "apple", true);

  assert.deepEqual(result.onlyInA, ["Apple"]);
  assert.deepEqual(result.onlyInB, ["apple"]);
  assert.equal(result.inBothCount, 0);
});

test("uses locale-invariant lowercasing for case-insensitive comparisons", () => {
  const original = String.prototype.toLocaleLowerCase;

  String.prototype.toLocaleLowerCase = function () {
    throw new Error("locale-sensitive lowercasing should not be used");
  };

  try {
    const result = compareLists("I", "i", false);

    assert.equal(result.inBothCount, 1);
    assert.deepEqual(result.inBoth, ["I"]);
  } finally {
    String.prototype.toLocaleLowerCase = original;
  }
});

test("trims surrounding whitespace before comparing", () => {
  const result = compareLists(" foo ", "foo", false);

  assert.equal(result.inBothCount, 1);
  assert.deepEqual(result.onlyInA, []);
  assert.deepEqual(result.onlyInB, []);
});

test("ignores blank lines in either list", () => {
  const result = compareLists("\nalpha\n\nbeta\n", "alpha\nbeta\n\n", false);

  assert.equal(result.inListA, 2);
  assert.equal(result.inListB, 2);
  assert.equal(result.inBothCount, 2);
});

test("deduplicates repeated items within the same list", () => {
  const insensitive = parseList("foo\nfoo\nFOO", false);
  const sensitive = parseList("foo\nfoo\nFOO", true);

  assert.equal(insensitive.uniqueCount, 1);
  assert.equal(sensitive.uniqueCount, 2);
});

test("preserves first-seen order in diff output", () => {
  const result = compareLists("zeta\nalpha\nzeta\nbeta", "", false);

  assert.deepEqual(result.onlyInA, ["zeta", "alpha", "beta"]);
});

test("handles an empty list on one side", () => {
  const result = compareLists("alpha\nbeta", "", false);

  assert.equal(result.inListA, 2);
  assert.equal(result.inListB, 0);
  assert.deepEqual(result.onlyInA, ["alpha", "beta"]);
  assert.deepEqual(result.onlyInB, []);
});

test("returns zero counts when both lists are empty", () => {
  const result = compareLists("", "", false);

  assert.equal(result.inListA, 0);
  assert.equal(result.inListB, 0);
  assert.equal(result.inBothCount, 0);
});

test("formats difference values with explicit positive signs", () => {
  assert.equal(formatDifference(1), "+1");
  assert.equal(formatDifference(0), "0");
  assert.equal(formatDifference(-2), "-2");
});

test("builds the summary text block in the expected order", () => {
  const result = compareLists("alpha\nbeta", "beta", false);

  assert.equal(
    buildSummaryText(result),
    [
      "Results:",
      "In List A: 2",
      "Only in List A: 1",
      "In List B: 1",
      "Only in List B: 0",
      "Difference: +1",
      "In Both Lists: 1",
    ].join("\n"),
  );
});

test("preserves first-seen order for shared items from list A", () => {
  const result = compareLists("beta\nalpha\ngamma", "alpha\nbeta", false);

  assert.deepEqual(result.inBoth, ["beta", "alpha"]);
  assert.equal(result.inBothCount, 2);
});
