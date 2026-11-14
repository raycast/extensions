import { validateIBAN, ValidationErrorsIBAN } from "ibantools";
import { describe, expect, it } from "vitest";
import { checkIban, COUNTRIES, parseIban, PROVIDER_TEST_IBANS } from "../index";

/** Provider-documented IBANs that intentionally fail mod-97 — none at present. */
const MOD97_EXCEPTIONS: readonly string[] = [];

describe("PROVIDER_TEST_IBANS", () => {
  it("has no duplicate provider+iban pairs", () => {
    const seen = new Set<string>();
    for (const entry of PROVIDER_TEST_IBANS) {
      const key = `${entry.provider}\0${entry.iban}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("Stripe labels are unique within each country", () => {
    const byKey = new Map<string, Set<string>>();
    for (const entry of PROVIDER_TEST_IBANS) {
      if (entry.provider !== "Stripe") continue;
      const key = `${entry.provider}\0${entry.countryCode}`;
      if (!byKey.has(key)) byKey.set(key, new Set());
      const labels = byKey.get(key)!;
      expect(labels.has(entry.label)).toBe(false);
      labels.add(entry.label);
    }
  });

  for (const entry of PROVIDER_TEST_IBANS) {
    it(`${entry.provider} ${entry.iban}`, () => {
      expect(entry.countryCode).toBe(entry.iban.slice(0, 2));
      const country = COUNTRIES.find((c) => c.code === entry.countryCode);
      expect(country, `supported country ${entry.countryCode}`).toBeDefined();
      expect(entry.iban.length).toBe(country!.ibanLength);

      if (!MOD97_EXCEPTIONS.includes(entry.iban)) {
        const validation = validateIBAN(entry.iban);
        expect(validation.errorCodes).not.toContain(ValidationErrorsIBAN.WrongIBANChecksum);
      }

      expect(() => parseIban(entry.iban)).not.toThrow();

      const issue = checkIban(entry.iban);
      expect(issue === undefined || issue === "national-check").toBe(true);
    });
  }
});
