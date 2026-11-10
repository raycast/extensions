import { isValidIBAN } from "ibantools";
import { describe, expect, it } from "vitest";
import { COUNTRIES, formatIban, generateIban, isValidIban } from "../index";

describe("generateIban per country", () => {
  for (const country of COUNTRIES) {
    it(`generates 200 valid IBANs for ${country.code}`, () => {
      for (let i = 0; i < 200; i++) {
        const result = generateIban({ countryCode: country.code });
        expect(result.iban.length).toBe(country.ibanLength);
        expect(isValidIBAN(result.iban)).toBe(true);
        expect(isValidIban(result.iban)).toBe(true);
      }
    });
  }
});

describe("generateIban per bank", () => {
  for (const country of COUNTRIES) {
    for (const bank of country.banks) {
      it(`uses bank ${bank.bankCode} in ${country.code}`, () => {
        const result = generateIban({
          countryCode: country.code,
          bankCode: bank.bankCode,
        });
        expect(isValidIBAN(result.iban)).toBe(true);
        expect(isValidIban(result.iban)).toBe(true);
        const layoutStart = result.bban.indexOf(
          bank.bankCode.length <= 4 ? bank.bankCode : bank.bankCode.slice(0, result.bankCode.length),
        );
        expect(layoutStart).toBeGreaterThanOrEqual(0);
        expect(result.bankCode).toBe(bank.bankCode.slice(0, result.bankCode.length));
        if (bank.bankCode.startsWith(result.bankCode)) {
          expect(result.bban.startsWith(result.bankCode) || result.bban.includes(bank.bankCode)).toBe(true);
        }
        expect(result.bankName).toBe(bank.name);
        if (bank.bic) {
          expect(result.bic).toBe(bank.bic);
        }
        if (bank.branchCode) {
          expect(result.branchCode).toBe(bank.branchCode);
        }
      });
    }
  }
});

describe("isValidIban known vectors", () => {
  const valid = [
    "DE89370400440532013000",
    "GB82WEST12345698765432",
    "FR1420041010050500013M02606",
    "NL91ABNA0417164300",
    "ES9121000418450200051332",
  ];

  for (const iban of valid) {
    it(`accepts ${iban}`, () => {
      expect(isValidIban(iban)).toBe(true);
    });
  }

  it("rejects tampered check digit", () => {
    expect(isValidIban("DE99370400440532013000")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidIban("DE8937040044053201300")).toBe(false);
  });

  it("rejects unsupported country", () => {
    expect(isValidIban("XX89370400440532013000")).toBe(false);
  });
});

describe("formatIban", () => {
  it("formats compact IBAN", () => {
    expect(formatIban("DE89370400440532013000")).toBe("DE89 3704 0044 0532 0130 00");
  });

  it("is idempotent on spaced input", () => {
    const spaced = "DE89 3704 0044 0532 0130 00";
    expect(formatIban(spaced)).toBe(spaced);
  });
});

describe("errors", () => {
  it("throws on unknown country", () => {
    expect(() => generateIban({ countryCode: "ZZ" })).toThrow(/Unsupported country/i);
  });

  it("throws on unknown bank", () => {
    expect(() => generateIban({ countryCode: "DE", bankCode: "99999999" })).toThrow(/Unknown bank/i);
  });
});
