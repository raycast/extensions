// ─────────────────────────────────────────────────────────────────────
// config-pure.test.mjs — unit tests for parsePositiveInt and
// validateChordKeys. Uses node:test (built-in, zero dependencies).
// Run: node --test src/lib/config-pure.test.mjs
// ─────────────────────────────────────────────────────────────────────
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parsePositiveInt, validateChordKeys } from "./config-pure.mjs";

describe("parsePositiveInt", () => {
  test("accepts a normal positive integer", () => {
    assert.equal(parsePositiveInt("200", "Timeout"), 200);
  });

  test("accepts large positive integers", () => {
    assert.equal(parsePositiveInt("1000000", "Timeout"), 1000000);
  });

  test("rejects zero (falsy but not positive)", () => {
    assert.throws(
      () => parsePositiveInt("0", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects negative integers", () => {
    assert.throws(
      () => parsePositiveInt("-5", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects NaN from non-numeric text", () => {
    assert.throws(
      () => parsePositiveInt("abc", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects empty string", () => {
    assert.throws(
      () => parsePositiveInt("", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects decimal (no silent truncation)", () => {
    assert.throws(
      () => parsePositiveInt("1.5", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects 1.0 decimal form — not decimal digit notation", () => {
    // After strict regex fix: "1.0" is rejected because it contains
    // a decimal point, which is not decimal digit notation.
    assert.throws(
      () => parsePositiveInt("1.0", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects Infinity", () => {
    assert.throws(
      () => parsePositiveInt("Infinity", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects negative decimal", () => {
    assert.throws(
      () => parsePositiveInt("-0.5", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects whitespace-only string", () => {
    assert.throws(
      () => parsePositiveInt("   ", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects exponent notation (1e3) — not decimal digits", () => {
    assert.throws(
      () => parsePositiveInt("1e3", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects leading + sign — not decimal digits", () => {
    assert.throws(
      () => parsePositiveInt("+5", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects leading zeros (01) — not valid decimal notation", () => {
    assert.throws(
      () => parsePositiveInt("01", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects trailing whitespace (200 ) — not pure digits", () => {
    assert.throws(
      () => parsePositiveInt("200 ", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects trailing newline (200\\n) — not pure digits", () => {
    assert.throws(
      () => parsePositiveInt("200\n", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects arrays (Number([5]) coercion gap closed)", () => {
    assert.throws(
      () => parsePositiveInt([5], "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("rejects number type (only strings accepted)", () => {
    assert.throws(
      () => parsePositiveInt(200, "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("accepts MAX_SAFE_INTEGER (9007199254740991)", () => {
    assert.equal(
      parsePositiveInt("9007199254740991", "Timeout"),
      9007199254740991,
    );
  });

  test("rejects values exceeding MAX_SAFE_INTEGER", () => {
    assert.throws(
      () => parsePositiveInt("9007199254740992", "Timeout"),
      /exceeds maximum safe integer/,
    );
  });

  test("rejects hex notation — not decimal digit notation", () => {
    // After strict regex fix: "0x10" is rejected because it contains
    // 'x', which is not a decimal digit.
    assert.throws(
      () => parsePositiveInt("0x10", "Timeout"),
      /Timeout must be a positive integer/,
    );
  });

  test("error message includes field name", () => {
    try {
      parsePositiveInt("bad", "Window");
      assert.fail("should have thrown");
    } catch (e) {
      assert.match(String(e.message), /Window/);
    }
  });

  test("error message includes the bad value for debugging", () => {
    try {
      parsePositiveInt("bad", "Window");
      assert.fail("should have thrown");
    } catch (e) {
      assert.match(String(e.message), /"bad"/);
    }
  });
});

describe("validateChordKeys", () => {
  test("accepts 2 keys", () => {
    const keys = ["left_shift", "right_shift"];
    assert.deepEqual(validateChordKeys(keys), keys);
  });

  test("accepts 3+ keys", () => {
    const keys = ["a", "b", "c"];
    assert.deepEqual(validateChordKeys(keys), keys);
  });

  test("rejects empty array", () => {
    assert.throws(() => validateChordKeys([]), /at least 2 keys/);
  });

  test("rejects single key (not a meaningful chord)", () => {
    assert.throws(() => validateChordKeys(["a"]), /at least 2 keys/);
  });

  test("rejects non-array (null)", () => {
    assert.throws(() => validateChordKeys(null), /at least 2 keys/);
  });

  test("rejects non-array (undefined)", () => {
    assert.throws(() => validateChordKeys(undefined), /at least 2 keys/);
  });

  test("error message includes actual count", () => {
    try {
      validateChordKeys(["a"]);
      assert.fail("should have thrown");
    } catch (e) {
      assert.match(String(e.message), /1/);
    }
  });
});
