import { describe, expect, it } from "vitest";
import { formatAddress, toNumber, formatCurrency } from "../format";

describe("formatAddress", () => {
  it("returns empty string for undefined", () => {
    expect(formatAddress(undefined)).toBe("");
  });

  it("returns only country for empty object (defaults land to Norge)", () => {
    expect(formatAddress({})).toBe("Norge");
  });

  it("formats full address", () => {
    const result = formatAddress({
      adresse: ["Storgata 1"],
      postnummer: "0182",
      poststed: "OSLO",
      land: "Norge",
    });
    expect(result).toBe("Storgata 1, 0182 OSLO, Norge");
  });

  it("defaults country to Norge when omitted", () => {
    const result = formatAddress({ adresse: ["Veien 2"], postnummer: "5000", poststed: "BERGEN" });
    expect(result).toBe("Veien 2, 5000 BERGEN, Norge");
  });

  it("handles multiple address lines", () => {
    const result = formatAddress({ adresse: ["Line 1", "Line 2"], postnummer: "0001", poststed: "OSLO" });
    expect(result).toBe("Line 1, Line 2, 0001 OSLO, Norge");
  });

  it("omits postal code when only poststed present", () => {
    const result = formatAddress({ poststed: "OSLO" });
    expect(result).toBe("OSLO, Norge");
  });

  it("omits poststed when only postnummer present", () => {
    const result = formatAddress({ postnummer: "0182" });
    expect(result).toBe("0182, Norge");
  });
});

describe("toNumber", () => {
  it("returns undefined for empty string", () => {
    expect(toNumber("")).toBeUndefined();
  });

  it("parses plain integer", () => {
    expect(toNumber("1000000")).toBe(1000000);
  });

  it("parses Norwegian space-separated thousands", () => {
    expect(toNumber("1 000 000")).toBe(1000000);
  });

  it("parses non-breaking space as separator", () => {
    expect(toNumber("1\u00A0500\u00A0000")).toBe(1500000);
  });

  it("parses Norwegian comma decimal", () => {
    expect(toNumber("1234,56")).toBe(1234.56);
  });

  it("parses mixed period thousands + comma decimal", () => {
    expect(toNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("parses negative value in parentheses", () => {
    expect(toNumber("(500 000)")).toBe(-500000);
  });

  it("returns undefined for non-numeric string", () => {
    expect(toNumber("abc")).toBeUndefined();
  });

  it("returns undefined for NaN input", () => {
    expect(toNumber("--")).toBeUndefined();
  });
});

describe("formatCurrency", () => {
  it("returns undefined for empty string", () => {
    expect(formatCurrency("")).toBeUndefined();
  });

  it("formats a positive NOK amount", () => {
    const result = formatCurrency("1000000");
    expect(result).toBeDefined();
    // The formatted output contains the numeric value (locale-dependent symbol)
    expect(result).toMatch(/1[\s\u00A0]?000[\s\u00A0]?000/);
  });

  it("formats a negative amount", () => {
    const result = formatCurrency("(500000)");
    expect(result).toBeDefined();
    expect(result).toMatch(/[-\u2212]/);
    expect(result).toMatch(/500[\s\u00A0]?000/);
  });
});
