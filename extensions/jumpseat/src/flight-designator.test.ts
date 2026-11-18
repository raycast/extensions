import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import contract from "./flight-designator-cases.json";
import {
  formatFlightDesignator,
  parseFlightDesignator,
} from "./flight-designator";

describe("governed flight designator cases", () => {
  it("are an unedited copy of the contract", () => {
    const note = readFileSync(
      join(__dirname, "flight-designator-cases.md"),
      "utf8",
    );
    const pinned = /sha256: `([0-9a-f]{64})`/.exec(note)?.[1];
    const actual = createHash("sha256")
      .update(readFileSync(join(__dirname, "flight-designator-cases.json")))
      .digest("hex");

    expect(pinned).toBeDefined();
    expect(actual).toBe(pinned);
    expect(contract.cases).toHaveLength(45);
  });

  it.each(contract.cases.map((testCase) => [testCase.name, testCase] as const))(
    "%s",
    (_name, testCase) => {
      const designator = parseFlightDesignator(testCase);
      const expected = testCase.expected;

      if (expected === null) {
        expect(designator).toBeNull();
      } else {
        expect(designator).toEqual({
          airlineCode: expected.airlineCode,
          flightNumber: expected.flightNumber,
        });
      }
      expect(formatFlightDesignator(designator, "compact")).toBe(
        expected?.compact ?? "",
      );
      expect(formatFlightDesignator(designator, "spaced")).toBe(
        expected?.spaced ?? "",
      );
    },
  );
});
