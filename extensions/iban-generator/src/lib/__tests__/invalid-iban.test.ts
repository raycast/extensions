import { validateIBAN, ValidationErrorsIBAN } from "ibantools";
import { describe, expect, it } from "vitest";
import { COUNTRIES, generateIban, generateInvalidIban, INVALID_KINDS, isValidIban } from "../index";
import type { InvalidKind } from "../types";
import { ibanPassesMod97 } from "./mod97-test-helper";

const E = ValidationErrorsIBAN;
const ITERATIONS = 32;

const KINDS = INVALID_KINDS.map((entry) => entry.kind);

function assertIbantoolsErrors(kind: InvalidKind, iban: string): void {
  const result = validateIBAN(iban);
  expect(result.valid).toBe(false);
  const codes = result.errorCodes;

  switch (kind) {
    case "checksum":
      expect(codes).toEqual([E.WrongIBANChecksum]);
      expect(ibanPassesMod97(iban)).toBe(false);
      break;
    case "too-short":
    case "too-long":
      expect(codes).toContain(E.WrongBBANLength);
      break;
    case "unknown-country":
      expect(codes).toContain(E.NoIBANCountry);
      expect(ibanPassesMod97(iban)).toBe(true);
      break;
    case "structure":
      expect(codes).toContain(E.WrongBBANFormat);
      expect(ibanPassesMod97(iban)).toBe(true);
      break;
    default:
      throw new Error(`Unhandled kind: ${kind satisfies never}`);
  }
}

describe("generateInvalidIban", () => {
  it("generateIban never sets invalidKind", () => {
    for (const country of COUNTRIES) {
      const result = generateIban({ countryCode: country.code });
      expect(result.invalidKind).toBeUndefined();
    }
  });

  for (const country of COUNTRIES) {
    for (const kind of KINDS) {
      it(`${country.code} / ${kind} (${ITERATIONS} samples)`, () => {
        for (let i = 0; i < ITERATIONS; i++) {
          const invalid = generateInvalidIban({ countryCode: country.code }, kind);
          expect(invalid.invalidKind).toBe(kind);
          expect(isValidIban(invalid.iban)).toBe(false);
          assertIbantoolsErrors(kind, invalid.iban);
        }
      });
    }
  }
});
