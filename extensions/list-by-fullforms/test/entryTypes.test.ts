import { describe, it, expect } from "vitest";
import { ENTRY_TYPES, entryTypeLabel } from "../src/lib/entryTypes";

describe("ENTRY_TYPES", () => {
  it("mirrors the server's four-value type enum", () => {
    expect(ENTRY_TYPES.map((t) => t.value)).toEqual([
      "term",
      "abbreviation",
      "word",
      "name",
    ]);
  });
});

describe("entryTypeLabel", () => {
  it("returns the display label for a known type", () => {
    expect(entryTypeLabel("abbreviation")).toBe("Abbreviation");
  });

  it("falls back to the raw value for an unknown/future type", () => {
    expect(entryTypeLabel("phrase")).toBe("phrase");
  });
});
