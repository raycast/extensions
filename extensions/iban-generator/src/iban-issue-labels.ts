import type { IbanIssue } from "./lib";

export const IBAN_ISSUE_LABELS: Record<IbanIssue, string> = {
  malformed: "Malformed",
  "unknown-country": "Unknown Country",
  length: "Wrong Length",
  structure: "Wrong Character Structure",
  checksum: "IBAN Checksum Fails",
  "national-check": "National Check Fails",
};

export const IBAN_VALIDATION_PASSED_LABEL = "Passes Validation";

export function ibanValidationLabel(issue: IbanIssue | undefined): string {
  if (issue === undefined) {
    return IBAN_VALIDATION_PASSED_LABEL;
  }
  return IBAN_ISSUE_LABELS[issue];
}
