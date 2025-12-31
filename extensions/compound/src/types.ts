export type CompoundFrequency = "yearly" | "monthly" | "daily";

export type RoundingMethod = "floor" | "round" | "ceil";

export type CurrencyCode = "JPY" | "USD" | "EUR";

export interface Params {
  /** Initial investment amount */
  principal: number;
  /** Monthly contribution amount */
  monthly: number;
  /** Annual interest rate (%) */
  ratePct: number;
  /** Period in years */
  years: number;
  /** Compound frequency */
  freq: CompoundFrequency;
  /** Whether to calculate after-tax values */
  afterTax: boolean;
  /** Tax rate (%) */
  taxRatePct: number;
  /** Currency for display */
  currency: CurrencyCode;
  /** Rounding method */
  rounding: RoundingMethod;
}

export interface Result {
  /** Final amount before tax */
  fvBeforeTax: number;
  /** Final amount after tax (only when afterTax is true) */
  fvAfterTax?: number;
  /** Total contributions (principal + monthly contributions) */
  contrib: number;
  /** Total gain */
  gain: number;
  /** Tax amount (only when afterTax is true) */
  tax?: number;
  /** Number of months used in calculation */
  months: number;
  /** Monthly interest rate */
  monthlyRate: number;
}

export interface Preferences {
  language: "en" | "ja";
  defaultCurrency: CurrencyCode;
  defaultTaxRate: string;
  defaultCompoundFreq: CompoundFrequency;
  defaultRounding: RoundingMethod;
}
