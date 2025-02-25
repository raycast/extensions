// utils/formatting.ts
import { UNITS } from "../constants/shared";

export const formatWeight = (weight: number, unitSystem: "kg" | "lbs"): string => {
  const value = unitSystem === "kg" ? weight : weight * UNITS.CONVERSION.KG_TO_LBS;
  return `${value.toFixed(UNITS.PRECISION.DISPLAY)} ${unitSystem}`;
};

export const formatPercentage = (percentage: number): string => {
  return `${(percentage * 100).toFixed(0)}%`;
};
