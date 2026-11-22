import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { humanize, money, truncate } from "../src/lib/format.ts";

describe("truncate", () => {
  it("keeps short text on one line", () => {
    assert.equal(truncate("  a\nb  ", 40), "a b");
  });
  it("cuts long text to the limit, ellipsis included", () => {
    const cut = truncate("General Partner at a fund with a very long name", 20);
    assert.ok(cut.length <= 20);
    assert.ok(cut.endsWith("…"));
  });
});

describe("humanize", () => {
  it("turns a stage id into words", () => {
    assert.equal(humanize("series_a"), "Series a");
    assert.equal(humanize("series_d_plus"), "Series d+");
  });
});

describe("money", () => {
  it("formats compact amounts, and nothing for a missing one", () => {
    assert.equal(money({ amount: 25_500_000, currency: "USD" }), "$25.5M");
    assert.equal(money(null), undefined);
  });
});
