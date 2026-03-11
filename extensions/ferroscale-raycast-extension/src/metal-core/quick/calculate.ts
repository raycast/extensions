import { calculateMetal } from "../calculator/engine";
import { roundTo } from "../calculator/units";
import type {
  CalculationInput,
  CurrencyCode,
  PriceBasis,
  PriceUnit,
} from "../calculator/types";
import { getProfileById } from "../datasets/profiles";
import type {
  QuickParseIssue,
  QuickWeightRequest,
  QuickWeightResponse,
} from "./types";
import { parseQuickQuery } from "./parser";

const DEFAULT_OUTPUT_DECIMALS = 3;

/* ------------------------------------------------------------------ */
/*  Perimeter computation (outer face, mm)                            */
/*  Used for surface area / paint quantity estimates.                 */
/*  Returns undefined when the profile geometry is not supported.     */
/* ------------------------------------------------------------------ */

function computePerimeterMm(request: QuickWeightRequest): number | undefined {
  const d = request.manualDimensionsMm;

  // For standard profiles, use the perimeterMm stored in the size record
  if (request.selectedSizeId) {
    const profile = getProfileById(request.profileId);
    if (profile && profile.mode === "standard") {
      const size = profile.sizes.find((s) => s.id === request.selectedSizeId);
      if (size?.perimeterMm != null) {
        return size.perimeterMm;
      }
    }
    return undefined;
  }

  // Manual profiles — compute from dimensions
  switch (request.profileId) {
    case "round_bar":
      return d.diameter != null ? Math.PI * d.diameter : undefined;

    case "square_bar":
      return d.side != null ? 4 * d.side : undefined;

    case "flat_bar":
      return d.width != null && d.thickness != null
        ? 2 * (d.width + d.thickness)
        : undefined;

    case "pipe":
      // outer face only
      return d.outerDiameter != null ? Math.PI * d.outerDiameter : undefined;

    case "square_hollow":
      // outer face only
      return d.side != null ? 4 * d.side : undefined;

    case "rectangular_tube":
      // outer face only
      return d.width != null && d.height != null
        ? 2 * (d.width + d.height)
        : undefined;

    case "angle":
      // two outer leg faces + two thickness edges
      return d.legA != null && d.legB != null && d.thickness != null
        ? d.legA + d.legB + 2 * d.thickness
        : undefined;

    case "sheet":
    case "plate":
    case "chequered_plate":
      // outer perimeter of the sheet cross-section
      return d.width != null && d.thickness != null
        ? 2 * (d.width + d.thickness)
        : undefined;

    default:
      return undefined;
  }
}

/* ------------------------------------------------------------------ */
/*  Map quick request to full CalculationInput                        */
/* ------------------------------------------------------------------ */

function toCalculationInput(request: QuickWeightRequest): CalculationInput {
  const manualDimensions = Object.fromEntries(
    Object.entries(request.manualDimensionsMm).map(([key, value]) => [
      key,
      { value, unit: "mm" },
    ]),
  );

  // Resolve pricing fields with sensible defaults
  const hasPricing =
    typeof request.unitPrice === "number" && request.unitPrice > 0;

  const priceBasis: PriceBasis = request.priceBasis ?? "weight";
  const priceUnit: PriceUnit = request.priceUnit ?? "kg";
  const currency: CurrencyCode = request.currency ?? "EUR";
  const unitPrice = hasPricing ? (request.unitPrice ?? 0) : 0;

  return {
    materialGradeId: request.materialGradeId,
    useCustomDensity: typeof request.customDensityKgPerM3 === "number",
    customDensityKgPerM3: request.customDensityKgPerM3,
    profileId: request.profileId,
    selectedSizeId: request.selectedSizeId,
    manualDimensions,
    customAreaMm2: request.customAreaMm2,
    length: { value: request.lengthMm, unit: "mm" },
    quantity: request.quantity,
    priceBasis,
    priceUnit,
    unitPrice,
    currency,
    wastePercent: 0,
    includeVat: false,
    vatPercent: 0,
    rounding: {
      weightDecimals: 8,
      priceDecimals: 4,
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

/* ------------------------------------------------------------------ */
/*  Core calculation                                                   */
/* ------------------------------------------------------------------ */

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

  // --- weight display extras ---
  const totalWeightTonne = roundTo(
    result.totalWeightKg / 1000,
    outputDecimals + 3,
  );
  const lengthM = request.lengthMm / 1000;
  const linearDensityKgPerM =
    lengthM > 0 ? roundTo(result.unitWeightKg / lengthM, outputDecimals) : 0;

  // --- surface area ---
  const perimeterMm = computePerimeterMm(request);
  let surfaceAreaM2: number | undefined;
  let linearSurfaceM2PerM: number | undefined;
  if (perimeterMm != null && perimeterMm > 0) {
    // perimeterMm / 1000 gives m²/m of length
    linearSurfaceM2PerM = roundTo(perimeterMm / 1000, outputDecimals);
    surfaceAreaM2 = roundTo(
      (perimeterMm / 1000) * lengthM * request.quantity,
      outputDecimals,
    );
  }

  // --- pricing ---
  const hasPricing =
    typeof request.unitPrice === "number" && request.unitPrice > 0;
  const unitPriceAmount = hasPricing
    ? roundTo(result.unitPriceAmount, 4)
    : undefined;
  const totalPriceAmount = hasPricing
    ? roundTo(result.subtotalAmount, 4)
    : undefined;
  const currency = hasPricing ? result.currency : undefined;

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
      totalWeightTonne,
      linearDensityKgPerM,
      surfaceAreaM2,
      linearSurfaceM2PerM,
      unitPriceAmount,
      totalPriceAmount,
      currency,
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
