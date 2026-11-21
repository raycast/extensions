import { describe, expect, it } from "vitest";
import { formatAddress, formatChange, formatPercent, websiteUrl } from "../src/lib/format";

describe("formatAddress", () => {
  it("joins street and place", () => {
    expect(formatAddress({ adresse: ["Forusbeen 50"], postnummer: "4035", poststed: "STAVANGER", land: "Norge" })).toBe(
      "Forusbeen 50, 4035 STAVANGER",
    );
  });

  it("adds a foreign country", () => {
    expect(formatAddress({ adresse: ["1 Main St"], poststed: "LONDON", land: "Storbritannia" })).toBe(
      "1 Main St, LONDON, Storbritannia",
    );
  });

  it("returns undefined for an empty address", () => expect(formatAddress({ adresse: [] })).toBeUndefined());
});

describe("formatPercent", () => {
  it("uses more decimals for small stakes", () => {
    expect(formatPercent(67)).toBe("67%");
    expect(formatPercent(0.00288)).toBe("0.003%");
  });
});

describe("websiteUrl", () => {
  it("adds a scheme when missing", () => expect(websiteUrl("www.equinor.com")).toBe("https://www.equinor.com"));
  it("keeps an existing scheme", () => expect(websiteUrl("http://a.no")).toBe("http://a.no"));
});

describe("formatChange", () => {
  it("shows growth and decline with a sign", () => {
    expect(formatChange(110, 100)).toBe("+10%");
    expect(formatChange(90, 100)).toBe("−10%");
  });

  it("measures change from a negative base by its size", () => expect(formatChange(50, -100)).toBe("+150%"));

  it("skips a missing or zero base", () => {
    expect(formatChange(10, 0)).toBeUndefined();
    expect(formatChange(10, null)).toBeUndefined();
  });
});
