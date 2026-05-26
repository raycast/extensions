import { describe, expect, it } from "vitest";
import { formatPhoneNumber } from "../format-phone";

describe("formatPhoneNumber", () => {
  it("formats a North American number with country code", () => {
    expect(formatPhoneNumber("+15145551234")).toBe("+1 514 555 1234");
  });

  it("formats a French number", () => {
    expect(formatPhoneNumber("+33612345678")).toBe("+33 6 12 34 56 78");
  });

  it("falls back to raw when no country code is detectable", () => {
    expect(formatPhoneNumber("5145551234")).toBe("5145551234");
  });

  it("returns empty string unchanged", () => {
    expect(formatPhoneNumber("")).toBe("");
  });

  it("formats a UK number", () => {
    expect(formatPhoneNumber("+447911123456")).toBe("+44 7911 123456");
  });

  it("preserves already-formatted international numbers", () => {
    const result = formatPhoneNumber("+1 514 555 1234");
    expect(result).toBe("+1 514 555 1234");
  });
});
