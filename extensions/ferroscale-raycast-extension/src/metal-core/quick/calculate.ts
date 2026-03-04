import { calculateMetal } from "../calculator/engine";
import { roundTo } from "../calculator/units";
import type { CalculationInput } from "../calculator/types";
import { getProfileById } from "../datasets/profiles";
import type {
  QuickParseIssue,
  QuickWeightRequest,
  QuickWeightResponse,
} from "./types";
import { parseQuickQuery } from "./parser";

const DEFAULT_OUTPUT_DECIMALS = 3;

function toCalculationInput(request: QuickWeightRequest): CalculationInput {
  const manualDimensions = Object.fromEntries(
    Object.entries(request.manualDimensionsMm).map(([key, value]) => [
      key,
      { value, unit: "mm" },
    ]),
  );

  return {
    materialGradeId: request.materialGradeId,
    useCustomDensity: typeof request.customDensityKgPerM3 === "number",
    customDensityKgPerM3: request.customDensityKgPerM3,
    profileId: request.profileId,
    selectedSizeId: request.selectedSizeId,
    manualDimensions,
    length: { value: request.lengthMm, unit: "mm" },
    quantity: request.quantity,
    priceBasis: "weight",
    priceUnit: "kg",
    unitPrice: 0,
    currency: "EUR",
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
    rounding: {
      weightDecimals: 8,
      priceDecimals: 2,
      dimensionDecimals: 4,
    },
  };
}

function mapIssues(
  issues: { field: string; message: string }[],
): QuickParseIssue[] {
  return issues.map((issue) => ({
    field: issue.field,
    code: "validation_error",
    message: issue.message,
  }));
}

export function calculateQuickWeight(
  request: QuickWeightRequest,
  outputDecimals = DEFAULT_OUTPUT_DECIMALS,
): QuickWeightResponse {
  const response = calculateMetal(toCalculationInput(request));
  if (!response.ok) {
    return { ok: false, issues: mapIssues(response.issues) };
  }

  const profile = getProfileById(request.profileId);
  const result = response.result;
  return {
    ok: true,
    result: {
      profileAlias: request.profileAlias,
      profileId: request.profileId,
      profileLabel: profile?.label ?? result.profileLabel,
      selectedSizeId: request.selectedSizeId,
      quantity: request.quantity,
      lengthMm: request.lengthMm,
      materialGradeId: request.materialGradeId,
      densityKgPerM3: roundTo(result.densityKgPerM3, 2),
      unitWeightKg: roundTo(result.unitWeightKg, outputDecimals),
      totalWeightKg: roundTo(result.totalWeightKg, outputDecimals),
      normalizedInput: request.normalizedInput,
    },
  };
}

export function calculateQuickFromQuery(
  rawQuery: string,
  outputDecimals = DEFAULT_OUTPUT_DECIMALS,
): QuickWeightResponse {
  const parsed = parseQuickQuery(rawQuery);
  if (!parsed.ok) {
    return { ok: false, issues: parsed.issues };
  }

  return calculateQuickWeight(parsed.request, outputDecimals);
}
