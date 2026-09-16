import { describe, expect, it } from "vitest";
import type { EntityType } from "./detection/types";
import { buildSummary } from "./summary";

function counts(entries: Array<[EntityType, number]>): Map<EntityType, number> {
  return new Map(entries);
}

describe("buildSummary", () => {
  it("renders the total, then the breakdown", () => {
    expect(
      buildSummary(
        counts([
          ["PERSON", 2],
          ["EMAIL", 1],
        ]),
      ),
    ).toBe("3 masked: 2 names, 1 email");
  });

  it("uses the singular for one", () => {
    expect(buildSummary(counts([["IBAN", 1]]))).toBe("1 masked: 1 IBAN");
  });

  it("reports nothing to mask", () => {
    expect(buildSummary(counts([]))).toBe("Nothing to mask");
  });

  it("flags an unreachable detector as partial", () => {
    expect(buildSummary(counts([["EMAIL", 1]]), "unreachable")).toBe(
      "1 masked: 1 email (partial: names and places not checked)",
    );
  });

  it("flags a timeout distinctly from unreachable", () => {
    expect(buildSummary(counts([["EMAIL", 1]]), "timeout")).toContain(
      "detector too slow",
    );
  });

  it("flags oversized input", () => {
    expect(buildSummary(counts([["EMAIL", 1]]), "too-large")).toContain(
      "text too long",
    );
  });

  it("still says partial when nothing was masked and the detector was down", () => {
    expect(buildSummary(counts([]), "unreachable")).toBe(
      "Nothing to mask (partial: names and places not checked)",
    );
  });

  it("orders types consistently regardless of map insertion order", () => {
    const a = buildSummary(
      counts([
        ["EMAIL", 1],
        ["PERSON", 1],
      ]),
    );
    const b = buildSummary(
      counts([
        ["PERSON", 1],
        ["EMAIL", 1],
      ]),
    );
    expect(a).toBe(b);
    expect(a).toBe("2 masked: 1 name, 1 email");
  });
});
