import { describe, it } from "node:test";
import assert from "node:assert";
import { validateDurationIndex, validateOptionalUrl, validatePositiveInteger } from "../src/utils/validation";

describe("validatePositiveInteger", () => {
  it("parses a valid integer", () => {
    assert.strictEqual(validatePositiveInteger("5", 1), 5);
  });

  it("falls back to the default when empty", () => {
    assert.strictEqual(validatePositiveInteger("", 3), 3);
    assert.strictEqual(validatePositiveInteger(undefined, 3), 3);
  });

  it("rejects zero and negative numbers", () => {
    assert.strictEqual(validatePositiveInteger("0", 1), null);
    assert.strictEqual(validatePositiveInteger("-1", 1), null);
  });

  it("rejects non-numeric values", () => {
    assert.strictEqual(validatePositiveInteger("abc", 1), null);
  });

  it("rejects decimal numbers", () => {
    assert.strictEqual(validatePositiveInteger("1.5", 1), null);
  });

  it("rejects trailing characters", () => {
    assert.strictEqual(validatePositiveInteger("2days", 1), null);
    assert.strictEqual(validatePositiveInteger("10abc", 1), null);
  });

  it("rejects whitespace-only values", () => {
    assert.strictEqual(validatePositiveInteger("   ", 1), 1);
  });
});

describe("validateDurationIndex", () => {
  it("accepts valid duration indices", () => {
    assert.strictEqual(validateDurationIndex("0", 6), 0);
    assert.strictEqual(validateDurationIndex("17", 6), 17);
  });

  it("rejects out-of-range indices", () => {
    assert.strictEqual(validateDurationIndex("18", 6), null);
    assert.strictEqual(validateDurationIndex("-1", 6), null);
  });

  it("falls back to default when empty", () => {
    assert.strictEqual(validateDurationIndex("", 6), 6);
  });
});

describe("validateOptionalUrl", () => {
  it("returns null for empty values", () => {
    assert.strictEqual(validateOptionalUrl(""), null);
    assert.strictEqual(validateOptionalUrl(undefined), null);
  });

  it("accepts valid URLs", () => {
    assert.strictEqual(validateOptionalUrl("https://example.com"), "https://example.com/");
  });

  it("rejects invalid URLs", () => {
    assert.strictEqual(validateOptionalUrl("not a url"), null);
  });

  it("rejects non-HTTP schemes", () => {
    assert.strictEqual(validateOptionalUrl("ftp://example.com"), null);
  });
});
