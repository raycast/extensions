import { getMaterialGradeById } from "../datasets/materials";
import { getProfileById } from "../datasets/profiles";
import type { CalculationInput, ValidationIssue } from "./types";
import { toMillimeters } from "./units";

const MAX_LENGTH_MM = 50_000;
const MAX_UNIT_PRICE = 1_000_000;
const MAX_QUANTITY = 10_000;

export function validateCalculationInput(
  input: CalculationInput,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const profile = getProfileById(input.profileId);
  const grade = getMaterialGradeById(input.materialGradeId);

  if (!profile) {
    issues.push({
      field: "profileId",
      message: "Select a valid profile type.",
      messageKey: "validation.profileInvalid",
    });
    return issues;
  }

  if (!input.useCustomDensity && !grade) {
    issues.push({
      field: "materialGradeId",
      message: "Select a valid material grade.",
      messageKey: "validation.materialInvalid",
    });
  }

  if (input.useCustomDensity) {
    if (
      typeof input.customDensityKgPerM3 !== "number" ||
      Number.isNaN(input.customDensityKgPerM3)
    ) {
      issues.push({
        field: "customDensityKgPerM3",
        message: "Enter a custom density value.",
        messageKey: "validation.customDensityRequired",
      });
    } else if (
      input.customDensityKgPerM3 < 100 ||
      input.customDensityKgPerM3 > 25_000
    ) {
      issues.push({
        field: "customDensityKgPerM3",
        message: "Custom density must be between 100 and 25,000 kg/m3.",
        messageKey: "validation.customDensityRange",
        messageValues: { min: 100, max: 25000 },
      });
    }
  }

  if (
    !Number.isFinite(input.quantity) ||
    input.quantity <= 0 ||
    input.quantity > MAX_QUANTITY
  ) {
    issues.push({
      field: "quantity",
      message: `Quantity must be between 1 and ${MAX_QUANTITY}.`,
      messageKey: "validation.quantityRange",
      messageValues: { max: MAX_QUANTITY },
    });
  }

  const lengthMm = toMillimeters(input.length.value, input.length.unit);
  if (!Number.isFinite(lengthMm) || lengthMm <= 0 || lengthMm > MAX_LENGTH_MM) {
    issues.push({
      field: "length",
      message: `Length must be between 1 mm and ${MAX_LENGTH_MM} mm.`,
      messageKey: "validation.lengthRange",
      messageValues: { max: MAX_LENGTH_MM },
    });
  }

  if (
    !Number.isFinite(input.unitPrice) ||
    input.unitPrice < 0 ||
    input.unitPrice > MAX_UNIT_PRICE
  ) {
    issues.push({
      field: "unitPrice",
      message: `Unit price must be between 0 and ${MAX_UNIT_PRICE}.`,
      messageKey: "validation.unitPriceRange",
      messageValues: { max: MAX_UNIT_PRICE },
    });
  }

  if (
    !Number.isFinite(input.wastePercent) ||
    input.wastePercent < 0 ||
    input.wastePercent > 100
  ) {
    issues.push({
      field: "wastePercent",
      message: "Waste percent must be between 0 and 100.",
      messageKey: "validation.wasteRange",
    });
  }

  if (
    input.includeVat &&
    (!Number.isFinite(input.vatPercent) ||
      input.vatPercent < 0 ||
      input.vatPercent > 35)
  ) {
    issues.push({
      field: "vatPercent",
      message: "VAT percent must be between 0 and 35.",
      messageKey: "validation.vatRange",
    });
  }

  if (profile.mode === "standard") {
    if (!input.selectedSizeId) {
      issues.push({
        field: "selectedSizeId",
        message: "Select a standard EN size.",
        messageKey: "validation.sizeRequired",
      });
    } else if (
      !profile.sizes.some((size) => size.id === input.selectedSizeId)
    ) {
      issues.push({
        field: "selectedSizeId",
        message: "Selected size is not valid for this profile.",
        messageKey: "validation.sizeInvalid",
      });
    }
  } else {
    for (const dimension of profile.dimensions) {
      const value = input.manualDimensions[dimension.key];
      if (!value) {
        issues.push({
          field: `manualDimensions.${dimension.key}`,
          message: `${dimension.label} is required.`,
          messageKey: "validation.dimensionRequired",
          messageValues: {
            labelKey: `dataset.dimensions.${dimension.key}`,
          },
        });
        continue;
      }

      const mmValue = toMillimeters(value.value, value.unit);
      if (
        !Number.isFinite(mmValue) ||
        mmValue < dimension.minMm ||
        mmValue > dimension.maxMm
      ) {
        issues.push({
          field: `manualDimensions.${dimension.key}`,
          message: `${dimension.label} must be between ${dimension.minMm} mm and ${dimension.maxMm} mm.`,
          messageKey: "validation.dimensionRange",
          messageValues: {
            labelKey: `dataset.dimensions.${dimension.key}`,
            min: dimension.minMm,
            max: dimension.maxMm,
          },
        });
      }
    }

    if (profile.id === "pipe") {
      const od = input.manualDimensions.outerDiameter;
      const wall = input.manualDimensions.wallThickness;
      if (od && wall) {
        const odMm = toMillimeters(od.value, od.unit);
        const wallMm = toMillimeters(wall.value, wall.unit);
        if (wallMm * 2 >= odMm) {
          issues.push({
            field: "manualDimensions.wallThickness",
            message:
              "Wall thickness must be less than half of the outer diameter.",
            messageKey: "validation.pipeWall",
          });
        }
      }
    }

    if (profile.id === "rectangular_tube") {
      const width = input.manualDimensions.width;
      const height = input.manualDimensions.height;
      const wall = input.manualDimensions.wallThickness;
      if (width && height && wall) {
        const widthMm = toMillimeters(width.value, width.unit);
        const heightMm = toMillimeters(height.value, height.unit);
        const wallMm = toMillimeters(wall.value, wall.unit);
        if (wallMm * 2 >= Math.min(widthMm, heightMm)) {
          issues.push({
            field: "manualDimensions.wallThickness",
            message:
              "Wall thickness must be less than half of width and height.",
            messageKey: "validation.rectangularWall",
          });
        }
      }
    }

    if (profile.id === "square_hollow") {
      const side = input.manualDimensions.side;
      const wall = input.manualDimensions.wallThickness;
      if (side && wall) {
        const sideMm = toMillimeters(side.value, side.unit);
        const wallMm = toMillimeters(wall.value, wall.unit);
        if (wallMm * 2 >= sideMm) {
          issues.push({
            field: "manualDimensions.wallThickness",
            message:
              "Wall thickness must be less than half of the side length.",
            messageKey: "validation.squareWall",
          });
        }
      }
    }

    if (profile.id === "angle") {
      const legA = input.manualDimensions.legA;
      const legB = input.manualDimensions.legB;
      const t = input.manualDimensions.thickness;
      if (legA && legB && t) {
        const legAMm = toMillimeters(legA.value, legA.unit);
        const legBMm = toMillimeters(legB.value, legB.unit);
        const tMm = toMillimeters(t.value, t.unit);
        if (tMm >= Math.min(legAMm, legBMm)) {
          issues.push({
            field: "manualDimensions.thickness",
            message: "Thickness must be less than the shorter leg.",
            messageKey: "validation.angleThickness",
          });
        }
      }
    }
  }

  if (
    input.priceBasis === "weight" &&
    !["kg", "lb"].includes(input.priceUnit)
  ) {
    issues.push({
      field: "priceUnit",
      message: "Weight-based pricing requires kg or lb.",
      messageKey: "validation.priceUnitWeight",
    });
  }

  if (input.priceBasis === "length" && !["m", "ft"].includes(input.priceUnit)) {
    issues.push({
      field: "priceUnit",
      message: "Length-based pricing requires m or ft.",
      messageKey: "validation.priceUnitLength",
    });
  }

  if (input.priceBasis === "piece" && input.priceUnit !== "piece") {
    issues.push({
      field: "priceUnit",
      message: "Piece-based pricing requires piece unit.",
      messageKey: "validation.priceUnitPiece",
    });
  }

  return issues;
}
