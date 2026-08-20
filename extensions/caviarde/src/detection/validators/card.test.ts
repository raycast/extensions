import { describe, expect, it } from "vitest";
import { isCardNumber } from "./card";
import { isLuhnValid } from "./luhn";

/** Published test numbers from the payment networks, valid by construction and
 * issued to nobody. */
const REAL_SHAPES: Array<[string, string]> = [
  ["Visa", "4111111111111111"],
  ["Mastercard", "5555555555554444"],
  ["Mastercard 2-series", "2223003122003222"],
  ["American Express", "378282246310005"],
  ["Discover", "6011111111111117"],
];

/** The point of the issuer check: each of these satisfies Luhn by chance, and
 * each is something a masked document has to keep usable. */
const LUHN_VALID_IDENTIFIERS: Array<[string, string]> = [
  ["epoch milliseconds", "1735689600005"],
  ["order number", "1234567890123452"],
];

describe("card numbers", () => {
  for (const [network, digits] of REAL_SHAPES) {
    it(`accepts a ${network} number`, () => {
      expect(isCardNumber(digits)).toBe(true);
    });
  }

  it("rejects a number whose check digit is wrong", () => {
    expect(isCardNumber("4111111111111112")).toBe(false);
  });

  it("rejects a run of digits too short or too long to be a card", () => {
    expect(isCardNumber("411111111111")).toBe(false);
    expect(isCardNumber("41111111111111111111")).toBe(false);
  });
});

describe("identifiers that satisfy Luhn without being cards", () => {
  for (const [name, digits] of LUHN_VALID_IDENTIFIERS) {
    it(`recognises that the ${name} passes Luhn`, () => {
      expect(isLuhnValid(digits)).toBe(true);
    });

    it(`still rejects the ${name}, which starts like no issuer`, () => {
      expect(isCardNumber(digits)).toBe(false);
    });
  }
});
