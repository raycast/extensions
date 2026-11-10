import { describe, expect, it } from "vitest";
import {
  checkIban,
  COUNTRIES,
  generateIban,
  generateInvalidIban,
  INVALID_KINDS,
  isValidIban,
  PROVIDER_TEST_IBANS,
} from "../index";
import type { InvalidKind } from "../types";

const KINDS = INVALID_KINDS.map((e) => e.kind);

const INVALID_TO_ISSUE: Record<InvalidKind, Exclude<ReturnType<typeof checkIban>, undefined>> = {
  checksum: "checksum",
  "too-short": "length",
  "too-long": "length",
  "unknown-country": "unknown-country",
  structure: "structure",
};

describe("checkIban", () => {
  it("matches isValidIban", () => {
    for (const country of COUNTRIES) {
      for (let i = 0; i < 20; i++) {
        const iban = generateIban({ countryCode: country.code }).iban;
        expect(isValidIban(iban)).toBe(checkIban(iban) === undefined);
      }
    }
  });

  it("valid generated IBANs have no issue", () => {
    for (const country of COUNTRIES) {
      expect(checkIban(generateIban({ countryCode: country.code }).iban)).toBeUndefined();
    }
  });

  for (const country of COUNTRIES) {
    for (const kind of KINDS) {
      it(`${country.code} invalid ${kind} -> ${INVALID_TO_ISSUE[kind]}`, () => {
        for (let i = 0; i < 24; i++) {
          const invalid = generateInvalidIban({ countryCode: country.code }, kind);
          expect(checkIban(invalid.iban)).toBe(INVALID_TO_ISSUE[kind]);
        }
      });
    }
  }

  it("detects malformed input", () => {
    expect(checkIban("")).toBe("malformed");
    expect(checkIban("DE89!370400440532013000")).toBe("malformed");
    expect(checkIban("D")).toBe("malformed");
    expect(checkIban("XX12")).toBe("malformed");
  });

  for (const entry of PROVIDER_TEST_IBANS) {
    it(`provider ${entry.provider} ${entry.iban}`, () => {
      const issue = checkIban(entry.iban);
      expect(issue === undefined || issue === "national-check").toBe(true);
    });
  }
});
