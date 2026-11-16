import { describe, expect, it } from "vitest";
import {
  computeCzechPrefixCheck,
  computeCzechSuffixCheck,
  isValidCzechSlovakBban,
} from "../checksum";
import { accountNumberFromBban, generateBban, BBAN_LAYOUTS } from "../bban-spec";
import { generateIban } from "../generate";
import { extractBbanParts } from "../bban-parts";

describe("Czech/Slovak mod-11 check digit", () => {
  it("rejects remainder 1 for suffix 000000006", () => {
    expect(() => computeCzechSuffixCheck("000000006")).toThrow(/remainder 1/i);
  });

  it("accepts a suffix whose check digit yields divisible weighted sum", () => {
    const bank4 = "0800";
    const prefix5 = "00000";
    const pCheck = computeCzechPrefixCheck(prefix5);
    const suffix9 = "000000000";
    const sCheck = computeCzechSuffixCheck(suffix9);
    expect(sCheck).toBe("0");
    const fullBban = bank4 + prefix5 + pCheck + suffix9 + sCheck;
    expect(fullBban.substring(10, 20)).toHaveLength(10);
    expect(isValidCzechSlovakBban(fullBban)).toBe(true);
  });

  it("rejects BBAN that would have used illegal check digit 1 for 000000006", () => {
    const bban = "0800000000000000061";
    expect(isValidCzechSlovakBban(bban)).toBe(false);
  });
});

describe("Czech/Slovak account number extraction", () => {
  it("round-trips ten-digit account including national check", () => {
    const layout = BBAN_LAYOUTS.CZ!;
    for (let i = 0; i < 50; i++) {
      const { bban, accountNumber } = generateBban({ layout, bankCode: "0800" });
      expect(accountNumber).toHaveLength(10);
      expect(accountNumberFromBban("CZ", bban)).toBe(accountNumber);
      expect(extractBbanParts("CZ", bban).accountNumber).toBe(accountNumber);
    }
  });

  it("generated CZ IBANs pass national check", () => {
    for (let i = 0; i < 100; i++) {
      const { bban } = generateIban({ countryCode: "CZ" });
      expect(isValidCzechSlovakBban(bban)).toBe(true);
      expect(bban.substring(10, 20)).toHaveLength(10);
    }
  });
});