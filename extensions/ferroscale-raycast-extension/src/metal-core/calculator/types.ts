import type { DimensionKey, ProfileId } from "../datasets/types";

export type LengthUnit = "mm" | "cm" | "m" | "in" | "ft";
export type WeightUnit = "kg" | "lb";
export type CurrencyCode = "EUR" | "USD" | "GBP" | "PLN" | "BAM";

/** Display symbol for each currency code. */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  PLN: "zł",
  BAM: "KM",
};

export type PriceBasis = "weight" | "length" | "piece";
export type PriceUnit = "kg" | "lb" | "m" | "ft" | "piece";

export interface UnitValue {
  value: number;
  unit: LengthUnit;
}

export interface RoundingConfig {
  weightDecimals: number;
  priceDecimals: number;
  dimensionDecimals: number;
}

export interface CalculationInput {
  materialGradeId: string;
  useCustomDensity: boolean;
  customDensityKgPerM3?: number;
  profileId: ProfileId;
  selectedSizeId?: string;
  manualDimensions: Partial<Record<DimensionKey, UnitValue>>;
  /** When set, overrides the cross-section area from profile/size lookup */
  customAreaMm2?: number;
  length: UnitValue;
  quantity: number;
  priceBasis: PriceBasis;
  priceUnit: PriceUnit;
  unitPrice: number;
  currency: CurrencyCode;
  wastePercent: number;
  includeVat: boolean;
  vatPercent: number;
  rounding: RoundingConfig;
}

export interface ValidationIssue {
  field: string;
  message: string;
  messageKey?: string;
  messageValues?: Record<string, string | number>;
}

export interface BreakdownRow {
  label: string;
  labelKey?: string;
  expression: string;
  value: number;
  unit: string;
}

export interface CalculationResult {
  profileId: ProfileId;
  profileLabel: string;
  gradeLabel: string;
  densityKgPerM3: number;
  areaMm2: number;
  lengthMm: number;
  quantity: number;
  unitWeightKg: number;
  totalWeightKg: number;
  totalWeightLb: number;
  unitPriceAmount: number;
  subtotalAmount: number;
  wasteAmount: number;
  subtotalWithWasteAmount: number;
  vatAmount: number;
  grandTotalAmount: number;
  currency: CurrencyCode;
  priceBasis: PriceBasis;
  priceUnit: PriceUnit;
  formulaLabel: string;
  datasetVersion: string;
  referenceLabels: string[];
  breakdownRows: BreakdownRow[];
}

export type CalculationResponse =
  | { ok: true; result: CalculationResult }
  | { ok: false; issues: ValidationIssue[] };
