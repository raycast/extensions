import { UNITS } from "../constants/shared";

/**
 * Formats a weight value for display.
 * NOTE: All weight values in the application are stored and calculated in kg internally.
 * This function only converts to lbs when displaying in the user's preferred unit system.
 *
 * @param weight - The weight value in kg
 * @param unitSystem - The user's preferred display unit system
 * @returns A formatted weight string with appropriate units
 */
export const formatWeight = (weight: number, unitSystem: "kg" | "lbs"): string => {
  const value = unitSystem === "kg" ? weight : weight * UNITS.CONVERSION.KG_TO_LBS;
  return `${value.toFixed(UNITS.PRECISION.DISPLAY)} ${unitSystem}`;
};

export const formatPercentage = (percentage: number): string => {
  return `${(percentage * 100).toFixed(0)}%`;
};
