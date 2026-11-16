import { describe, expect, it } from "vitest";
import { generateInvalidIban } from "../invalid";

describe("generateInvalidIban breakdown fields", () => {
  it("structure corruption reflects mutated bank code for DE", () => {
    const invalid = generateInvalidIban({ countryCode: "DE", bankCode: "50010517" }, "structure");
    expect(invalid.bankCode).toBe(invalid.bban.slice(0, 8));
    expect(invalid.accountNumber).toBe(invalid.bban.slice(8, 18));
    expect(invalid.bban).toMatch(/[A-Z]/);
  });

  it("too-short IBAN labels breakdown from valid reference", () => {
    const invalid = generateInvalidIban({ countryCode: "DE", bankCode: "50010517" }, "too-short");
    expect(invalid.iban.length).toBeLessThan(22);
    expect(invalid.bankCode).toMatch(/^— \(valid: /);
    expect(invalid.accountNumber).toMatch(/^— \(valid: /);
    expect(invalid.bankCode).toContain("50010517");
  });
});