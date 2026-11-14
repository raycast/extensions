import { describe, expect, it } from "vitest";
import { IBAN_ISSUE_LABELS, IBAN_VALIDATION_PASSED_LABEL, ibanValidationLabel } from "../iban-issue-labels";

describe("ibanValidationLabel", () => {
  it("returns pass label when there is no issue", () => {
    expect(ibanValidationLabel(undefined)).toBe(IBAN_VALIDATION_PASSED_LABEL);
  });

  it("maps every issue to the expected display text", () => {
    expect(ibanValidationLabel("malformed")).toBe("Malformed");
    expect(ibanValidationLabel("unknown-country")).toBe("Unknown Country");
    expect(ibanValidationLabel("length")).toBe("Wrong Length");
    expect(ibanValidationLabel("structure")).toBe("Wrong Character Structure");
    expect(ibanValidationLabel("checksum")).toBe("IBAN Checksum Fails");
    expect(ibanValidationLabel("national-check")).toBe("National Check Fails");
  });

  it("covers all defined issues", () => {
    const issues = Object.keys(IBAN_ISSUE_LABELS) as (keyof typeof IBAN_ISSUE_LABELS)[];
    expect(issues).toHaveLength(6);
    for (const issue of issues) {
      expect(ibanValidationLabel(issue)).toBe(IBAN_ISSUE_LABELS[issue]);
    }
  });
});
