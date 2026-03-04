import { DATASET_VERSION } from "../datasets/version";
import { getMaterialGradeById } from "../datasets/materials";
import { getProfileById } from "../datasets/profiles";
import type {
  CalculationInput,
  CalculationResponse,
  BreakdownRow,
  PriceBasis,
} from "./types";
import { CURRENCY_SYMBOLS } from "./types";
import {
  kilogramsToPounds,
  metersToFeet,
  millimetersToMeters,
  roundTo,
  toMillimeters,
} from "./units";
import { validateCalculationInput } from "./validation";

function getManualDimensionMm(
  input: CalculationInput,
  key: keyof CalculationInput["manualDimensions"],
): number {
  const dimension = input.manualDimensions[key];
  if (!dimension) {
    return 0;
  }

  return toMillimeters(dimension.value, dimension.unit);
}

export function resolveAreaMm2(input: CalculationInput): {
  areaMm2: number;
  expression: string;
} {
  const profile = getProfileById(input.profileId);
  if (!profile) {
    return { areaMm2: 0, expression: "Invalid profile" };
  }

  if (profile.mode === "standard") {
    const size = profile.sizes.find((item) => item.id === input.selectedSizeId);
    if (!size) {
      return { areaMm2: 0, expression: "Missing EN size selection" };
    }

    return {
      areaMm2: size.areaMm2,
      expression: `A from EN size table (${size.label})`,
    };
  }

  if (profile.id === "round_bar") {
    const diameter = getManualDimensionMm(input, "diameter");
    return {
      areaMm2: (Math.PI * diameter * diameter) / 4,
      expression: `A = pi * ${diameter.toFixed(3)}^2 / 4`,
    };
  }

  if (profile.id === "square_bar") {
    const side = getManualDimensionMm(input, "side");
    return {
      areaMm2: side * side,
      expression: `A = ${side.toFixed(3)}^2`,
    };
  }

  if (
    profile.id === "flat_bar" ||
    profile.id === "sheet" ||
    profile.id === "plate" ||
    profile.id === "expanded_metal" ||
    profile.id === "corrugated_sheet"
  ) {
    const width = getManualDimensionMm(input, "width");
    const thickness = getManualDimensionMm(input, "thickness");
    return {
      areaMm2: width * thickness,
      expression: `A = ${width.toFixed(3)} × ${thickness.toFixed(3)}`,
    };
  }

  if (profile.id === "chequered_plate") {
    const width = getManualDimensionMm(input, "width");
    const thickness = getManualDimensionMm(input, "thickness");
    const patternHeight = getManualDimensionMm(input, "patternHeight");
    return {
      areaMm2: width * (thickness + patternHeight * 0.5),
      expression: `A = ${width.toFixed(3)} × (${thickness.toFixed(3)} + ${patternHeight.toFixed(3)} × 0.5)`,
    };
  }

  if (profile.id === "pipe") {
    const outerDiameter = getManualDimensionMm(input, "outerDiameter");
    const wallThickness = getManualDimensionMm(input, "wallThickness");
    const innerDiameter = outerDiameter - wallThickness * 2;
    return {
      areaMm2:
        (Math.PI *
          (outerDiameter * outerDiameter - innerDiameter * innerDiameter)) /
        4,
      expression: `A = pi * (${outerDiameter.toFixed(3)}^2 - ${innerDiameter.toFixed(3)}^2) / 4`,
    };
  }

  if (profile.id === "rectangular_tube") {
    const width = getManualDimensionMm(input, "width");
    const height = getManualDimensionMm(input, "height");
    const wallThickness = getManualDimensionMm(input, "wallThickness");
    return {
      areaMm2:
        width * height -
        (width - wallThickness * 2) * (height - wallThickness * 2),
      expression: `A = ${width.toFixed(3)}×${height.toFixed(3)} − (${width.toFixed(3)}−2×${wallThickness.toFixed(
        3,
      )})×(${height.toFixed(3)}−2×${wallThickness.toFixed(3)})`,
    };
  }

  if (profile.id === "square_hollow") {
    const side = getManualDimensionMm(input, "side");
    const wallThickness = getManualDimensionMm(input, "wallThickness");
    return {
      areaMm2:
        side * side - (side - wallThickness * 2) * (side - wallThickness * 2),
      expression: `A = ${side.toFixed(3)}² − (${side.toFixed(3)}−2×${wallThickness.toFixed(3)})²`,
    };
  }

  if (profile.id === "angle") {
    const legA = getManualDimensionMm(input, "legA");
    const legB = getManualDimensionMm(input, "legB");
    const thickness = getManualDimensionMm(input, "thickness");
    return {
      areaMm2: (legA + legB - thickness) * thickness,
      expression: `A = (${legA.toFixed(3)} + ${legB.toFixed(3)} − ${thickness.toFixed(3)}) × ${thickness.toFixed(3)}`,
    };
  }

  return { areaMm2: 0, expression: "Unsupported profile formula" };
}

function calculateUnitPrice(
  basis: PriceBasis,
  priceUnit: CalculationInput["priceUnit"],
  unitPrice: number,
  unitWeightKg: number,
  pieceLengthMm: number,
): { unitPriceAmount: number; expression: string } {
  if (basis === "weight") {
    if (priceUnit === "lb") {
      const unitWeightLb = kilogramsToPounds(unitWeightKg);
      return {
        unitPriceAmount: unitWeightLb * unitPrice,
        expression: `${unitWeightLb.toFixed(6)} lb * ${unitPrice}`,
      };
    }

    return {
      unitPriceAmount: unitWeightKg * unitPrice,
      expression: `${unitWeightKg.toFixed(6)} kg * ${unitPrice}`,
    };
  }

  if (basis === "length") {
    const lengthM = millimetersToMeters(pieceLengthMm);
    if (priceUnit === "ft") {
      const lengthFt = metersToFeet(lengthM);
      return {
        unitPriceAmount: lengthFt * unitPrice,
        expression: `${lengthFt.toFixed(6)} ft * ${unitPrice}`,
      };
    }

    return {
      unitPriceAmount: lengthM * unitPrice,
      expression: `${lengthM.toFixed(6)} m * ${unitPrice}`,
    };
  }

  return {
    unitPriceAmount: unitPrice,
    expression: `${unitPrice} / piece`,
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export function calculateMetal(input: CalculationInput): CalculationResponse {
  const issues = validateCalculationInput(input);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const profile = getProfileById(input.profileId);
  if (!profile) {
    return {
      ok: false,
      issues: [
        {
          field: "profileId",
          message: "Profile not found.",
          messageKey: "validation.profileNotFound",
        },
      ],
    };
  }

  const grade = getMaterialGradeById(input.materialGradeId);
  const densityKgPerM3 = input.useCustomDensity
    ? (input.customDensityKgPerM3 ?? 0)
    : (grade?.densityKgPerM3 ?? 0);
  const gradeLabel = input.useCustomDensity
    ? "Custom density input"
    : (grade?.label ?? "Unknown");

  const lengthMm = toMillimeters(input.length.value, input.length.unit);
  const { areaMm2, expression: areaExpression } = resolveAreaMm2(input);
  const volumePerPieceM3 = (areaMm2 * lengthMm) / 1_000_000_000;

  const unitWeightKg = volumePerPieceM3 * densityKgPerM3;
  const rawTotalWeightKg = unitWeightKg * input.quantity;
  const wasteMultiplier = 1 + input.wastePercent / 100;
  const totalWeightKg = rawTotalWeightKg * wasteMultiplier;
  const totalWeightLb = kilogramsToPounds(totalWeightKg);

  const price = calculateUnitPrice(
    input.priceBasis,
    input.priceUnit,
    input.unitPrice,
    unitWeightKg,
    lengthMm,
  );
  const subtotalAmount = price.unitPriceAmount * input.quantity;
  const wasteAmount = subtotalAmount * (wasteMultiplier - 1);
  const subtotalWithWasteAmount = subtotalAmount + wasteAmount;
  const vatAmount = input.includeVat
    ? subtotalWithWasteAmount * (input.vatPercent / 100)
    : 0;
  const grandTotalAmount = subtotalWithWasteAmount + vatAmount;

  const rows: BreakdownRow[] = [
    {
      label: "Cross-section area",
      labelKey: "resultRows.crossSectionArea",
      expression: areaExpression,
      value: areaMm2,
      unit: "mm2",
    },
    {
      label: "Volume per piece",
      labelKey: "resultRows.volumePerPiece",
      expression: `${areaMm2.toFixed(4)} * ${lengthMm.toFixed(4)} / 1e9`,
      value: volumePerPieceM3,
      unit: "m3",
    },
    {
      label: "Unit weight",
      labelKey: "resultRows.unitWeight",
      expression: `${volumePerPieceM3.toExponential(6)} * ${densityKgPerM3}`,
      value: unitWeightKg,
      unit: "kg",
    },
    {
      label: "Unit price",
      labelKey: "resultRows.unitPrice",
      expression: price.expression,
      value: price.unitPriceAmount,
      unit: CURRENCY_SYMBOLS[input.currency],
    },
    {
      label: "Subtotal",
      labelKey: "resultRows.subtotal",
      expression: `${price.unitPriceAmount.toFixed(4)} * ${input.quantity}`,
      value: subtotalAmount,
      unit: CURRENCY_SYMBOLS[input.currency],
    },
    {
      label: "Waste adjustment",
      labelKey: "resultRows.wasteAdjustment",
      expression: `${subtotalAmount.toFixed(4)} * (${input.wastePercent}/100)`,
      value: wasteAmount,
      unit: CURRENCY_SYMBOLS[input.currency],
    },
  ];

  if (input.includeVat) {
    rows.push({
      label: "VAT",
      labelKey: "resultRows.vat",
      expression: `${subtotalWithWasteAmount.toFixed(4)} * (${input.vatPercent}/100)`,
      value: vatAmount,
      unit: CURRENCY_SYMBOLS[input.currency],
    });
  }

  const sizeReference =
    profile.mode === "standard"
      ? profile.sizes.find((item) => item.id === input.selectedSizeId)
          ?.referenceLabel
      : undefined;

  const references = dedupe(
    [
      `Dataset ${DATASET_VERSION}`,
      profile.referenceLabel,
      sizeReference,
      input.useCustomDensity
        ? "User-provided custom density"
        : grade?.referenceLabel,
    ].filter((value): value is string => Boolean(value)),
  );

  return {
    ok: true,
    result: {
      profileId: profile.id,
      profileLabel: profile.label,
      gradeLabel,
      densityKgPerM3: roundTo(densityKgPerM3, input.rounding.dimensionDecimals),
      areaMm2: roundTo(areaMm2, input.rounding.dimensionDecimals),
      lengthMm: roundTo(lengthMm, input.rounding.dimensionDecimals),
      quantity: input.quantity,
      unitWeightKg: roundTo(unitWeightKg, input.rounding.weightDecimals),
      totalWeightKg: roundTo(totalWeightKg, input.rounding.weightDecimals),
      totalWeightLb: roundTo(totalWeightLb, input.rounding.weightDecimals),
      unitPriceAmount: roundTo(
        price.unitPriceAmount,
        input.rounding.priceDecimals,
      ),
      subtotalAmount: roundTo(subtotalAmount, input.rounding.priceDecimals),
      wasteAmount: roundTo(wasteAmount, input.rounding.priceDecimals),
      subtotalWithWasteAmount: roundTo(
        subtotalWithWasteAmount,
        input.rounding.priceDecimals,
      ),
      vatAmount: roundTo(vatAmount, input.rounding.priceDecimals),
      grandTotalAmount: roundTo(grandTotalAmount, input.rounding.priceDecimals),
      currency: input.currency,
      priceBasis: input.priceBasis,
      priceUnit: input.priceUnit,
      formulaLabel: profile.formulaLabel,
      datasetVersion: DATASET_VERSION,
      referenceLabels: references,
      breakdownRows: rows.map((row) => ({
        ...row,
        value: roundTo(
          row.value,
          row.unit === CURRENCY_SYMBOLS[input.currency]
            ? input.rounding.priceDecimals
            : input.rounding.dimensionDecimals,
        ),
      })),
    },
  };
}
