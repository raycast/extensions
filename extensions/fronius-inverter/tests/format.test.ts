import { describe, expect, it } from "vitest";
import { formatEnergy, formatPower } from "../src/format";

describe("Fronius value formatting", () => {
  it("preserves the sign for bidirectional power values", () => {
    expect(formatPower(-4177.7, true)).toBe("−4177.7 W");
    expect(formatPower(250, true)).toBe("+250.0 W");
  });

  it("handles missing and invalid energy values", () => {
    expect(formatEnergy(null)).toBe("N/A");
    expect(formatEnergy("invalid")).toBe("N/A");
  });
});
