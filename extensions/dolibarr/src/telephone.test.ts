import { describe, expect, it } from "vitest";
import { mailtoUrl, telUrl } from "./telephone";

describe("telUrl", () => {
  it("passes a clean number through", () => {
    expect(telUrl("+4940432180")).toBe("tel:+4940432180");
  });

  it("strips spaces, dashes, slashes and brackets", () => {
    expect(telUrl("+49 721 1234-100")).toBe("tel:+497211234100");
    expect(telUrl("(0721) 1234/100")).toBe("tel:07211234100");
  });

  it("keeps a leading plus but drops any other", () => {
    expect(telUrl("+49+721")).toBe("tel:+49721");
  });

  it("returns null for an empty or missing number", () => {
    expect(telUrl(null)).toBeNull();
    expect(telUrl("")).toBeNull();
    expect(telUrl("   ")).toBeNull();
  });

  it("returns null when too few digits remain to dial", () => {
    expect(telUrl("-/-")).toBeNull();
    expect(telUrl("12")).toBeNull();
  });
});

describe("mailtoUrl", () => {
  it("builds a mailto target", () => {
    expect(mailtoUrl("a.mueller@example.org")).toBe("mailto:a.mueller@example.org");
  });

  it("trims surrounding whitespace", () => {
    expect(mailtoUrl("  info@example.org  ")).toBe("mailto:info@example.org");
  });

  it("returns null for a missing or implausible address", () => {
    expect(mailtoUrl(null)).toBeNull();
    expect(mailtoUrl("")).toBeNull();
    expect(mailtoUrl("kein-at-zeichen")).toBeNull();
  });
});
