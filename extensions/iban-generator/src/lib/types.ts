export interface Bank {
  name: string;
  bankCode: string;
  branchCode?: string;
  bic?: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  ibanLength: number;
  sepa: boolean;
  banks: Bank[];
}

export interface GenerateOptions {
  countryCode: string;
  bankCode?: string;
}

export type InvalidKind = "checksum" | "too-short" | "too-long" | "unknown-country" | "structure";

export interface GeneratedIban {
  iban: string;
  formatted: string;
  countryCode: string;
  countryName: string;
  flag: string;
  sepa: boolean;
  checkDigits: string;
  bban: string;
  bankCode: string;
  branchCode?: string;
  accountNumber: string;
  bankName?: string;
  bic?: string;
  invalidKind?: InvalidKind;
}

export type IbanIssue = "malformed" | "unknown-country" | "length" | "structure" | "checksum" | "national-check";

export type ProviderOutcome = "success" | "failure" | "dispute" | "other";

export interface ProviderTestIban {
  provider: string;
  iban: string;
  label: string;
  description?: string;
  outcome: ProviderOutcome;
  countryCode: string;
  sourceUrl: string;
}
