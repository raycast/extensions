import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertTimeZone, mergeEventLabels, normalizeHexColor } from "./calendar-values";

describe("calendar value helpers", () => {
  it("normalizes six-digit hex colors and rejects malformed values", () => {
    assert.equal(normalizeHexColor(" #A4BDFC "), "#a4bdfc");
    assert.throws(() => normalizeHexColor("#fff"), /six-digit hexadecimal/);
    assert.throws(() => normalizeHexColor("blue"), /six-digit hexadecimal/);
  });

  it("validates IANA time zones", () => {
    assert.doesNotThrow(() => assertTimeZone("America/New_York"));
    assert.throws(() => assertTimeZone("Not/A_Zone"), /Invalid IANA time zone/);
    assert.throws(() => assertTimeZone("  "), /cannot be empty/);
  });

  it("merges label changes without mutating the source", () => {
    const original = [{ id: "one", name: "Old", backgroundColor: "#000000" }];
    const renamed = mergeEventLabels(original, { action: "rename", labelId: "one", name: "New" });
    const recolored = mergeEventLabels(renamed, {
      action: "recolor",
      labelId: "one",
      backgroundColor: "#A4BDFC",
    });
    const created = mergeEventLabels(recolored, {
      action: "create",
      id: "two",
      name: "Customer",
      backgroundColor: "#039be5",
    });
    const deleted = mergeEventLabels(created, { action: "delete", labelId: "one" });

    assert.equal(original[0].name, "Old");
    assert.equal(recolored[0].backgroundColor, "#a4bdfc");
    assert.deepEqual(deleted, [{ id: "two", name: "Customer", backgroundColor: "#039be5" }]);
    assert.throws(() => mergeEventLabels(original, { action: "delete", labelId: "missing" }), /does not exist/);
  });
});
