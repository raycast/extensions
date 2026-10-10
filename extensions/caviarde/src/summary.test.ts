import { describe, expect, it } from "vitest";
import type { EntityType } from "./detection/types";
import { buildSummary } from "./summary";

function counts(entries: Array<[EntityType, number]>): Map<EntityType, number> {
  return new Map(entries);
}

describe("buildSummary", () => {
  it("names the categories when there are few of them", () => {
    expect(buildSummary(counts([["EMAIL", 1]]))).toBe("Pasted. 1 email masked");
    expect(
      buildSummary(
        counts([
          ["PERSON", 2],
          ["EMAIL", 1],
        ]),
      ),
    ).toBe("Pasted. 2 names, 1 email masked");
  });

  // A HUD has no duration, so a long line simply flashes past unread.
  it("falls back to the total past three categories", () => {
    expect(
      buildSummary(
        counts([
          ["PERSON", 1],
          ["LOCATION", 1],
          ["EMAIL", 1],
          ["PHONE", 1],
        ]),
      ),
    ).toBe("Pasted. 4 values masked");
  });

  it("keeps the breakdown at exactly three categories", () => {
    expect(
      buildSummary(
        counts([
          ["PERSON", 1],
          ["EMAIL", 1],
          ["IBAN", 1],
        ]),
      ),
    ).toBe("Pasted. 1 name, 1 email, 1 IBAN masked");
  });

  it("uses the singular for one value", () => {
    expect(buildSummary(counts([["IBAN", 1]]), true)).toBe(
      "Pasted. 1 value masked. Names, locations and organisations not checked",
    );
  });

  // Describes what was observed. "Nothing to mask" would claim knowledge of
  // what the text contained.
  it("reports an observed result rather than a judgement", () => {
    expect(buildSummary(counts([]))).toBe("Pasted. Nothing detected");
  });

  it("says what went unchecked instead of the breakdown", () => {
    expect(buildSummary(counts([["EMAIL", 1]]), true)).toBe(
      "Pasted. 1 value masked. Names, locations and organisations not checked",
    );
  });

  it("says the paste went out unchanged when nothing matched either", () => {
    expect(buildSummary(counts([]), true)).toBe(
      "Pasted unchanged. Names, locations and organisations not checked",
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
    expect(a).toBe("Pasted. 1 name, 1 email masked");
  });

  it("never uses a semicolon", () => {
    const samples = [
      buildSummary(counts([["EMAIL", 1]])),
      buildSummary(counts([]), true),
      buildSummary(counts([["PERSON", 9]]), true),
    ];
    for (const sample of samples) expect(sample).not.toContain(";");
  });
});
