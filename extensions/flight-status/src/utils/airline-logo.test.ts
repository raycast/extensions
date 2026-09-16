import { describe, it, expect } from "vitest";
import { airlineLogoUrl } from "./airline-logo";

describe("airlineLogoUrl", () => {
  it("builds a logo URL for a 2-letter IATA code", () => {
    expect(airlineLogoUrl("UA")).toBe(
      "https://images.kiwi.com/airlines/64x64/UA.png",
    );
  });

  it("uppercases the code", () => {
    expect(airlineLogoUrl("vy")).toBe(
      "https://images.kiwi.com/airlines/64x64/VY.png",
    );
  });

  it("handles alphanumeric codes and surrounding whitespace", () => {
    expect(airlineLogoUrl("5x")).toBe(
      "https://images.kiwi.com/airlines/64x64/5X.png",
    );
    expect(airlineLogoUrl(" u2 ")).toBe(
      "https://images.kiwi.com/airlines/64x64/U2.png",
    );
  });

  it("returns null for missing or malformed codes", () => {
    expect(airlineLogoUrl(null)).toBeNull();
    expect(airlineLogoUrl(undefined)).toBeNull();
    expect(airlineLogoUrl("")).toBeNull();
    expect(airlineLogoUrl("XYZ")).toBeNull();
    expect(airlineLogoUrl("U")).toBeNull();
  });
});
