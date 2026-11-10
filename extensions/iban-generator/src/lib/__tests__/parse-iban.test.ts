import { describe, expect, it } from "vitest";
import { COUNTRIES, generateIban, parseIban } from "../index";

describe("parseIban round-trip", () => {
  for (const country of COUNTRIES) {
    it(`matches generateIban for ${country.code}`, () => {
      const generated = generateIban({ countryCode: country.code });
      expect(parseIban(generated.iban)).toEqual(generated);
      expect(parseIban(generated.formatted)).toEqual(generated);
      expect(parseIban(generated.iban.toLowerCase())).toEqual(generated);
    });
  }
});

describe("parseIban per bank", () => {
  for (const country of COUNTRIES) {
    for (const bank of country.banks) {
      it(`matches generateIban for ${country.code} / ${bank.bankCode}`, () => {
        const generated = generateIban({
          countryCode: country.code,
          bankCode: bank.bankCode,
        });
        expect(parseIban(generated.iban)).toEqual(generated);
      });
    }
  }
});

describe("parseIban errors", () => {
  it("rejects unknown country", () => {
    expect(() => parseIban("XX89370400440532013000")).toThrow(/Unsupported country/);
  });

  it("rejects wrong length", () => {
    expect(() => parseIban("DE8937040044053201300")).toThrow(/Invalid IBAN length/);
  });
});
