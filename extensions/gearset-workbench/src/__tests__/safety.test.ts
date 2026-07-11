import { describe, expect, it } from "vitest";
import { PRODUCTION_CONFIRMATION, productionConfirmationMatches } from "../safety";

describe("production run confirmation", () => {
  it("requires the exact phrase", () => {
    expect(productionConfirmationMatches(PRODUCTION_CONFIRMATION)).toBe(true);
    expect(productionConfirmationMatches("run production")).toBe(false);
    expect(productionConfirmationMatches(`${PRODUCTION_CONFIRMATION} `)).toBe(false);
  });
});
