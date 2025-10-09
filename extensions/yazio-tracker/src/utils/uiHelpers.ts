// UI utility functions
import { PROGRESS_COLORS } from "../constants";

export function getProgressIcon(progress: number): string {
  const percentage = Math.round(progress * 100);

  // Create a visual progress indicator using Unicode blocks
  if (percentage <= 10) return `🔴`; // Very low
  if (percentage <= 25) return `🟠`; // Low
  if (percentage <= 50) return `🟡`; // Medium-low
  if (percentage <= 75) return `🟢`; // Medium-high
  if (percentage <= 90) return `🔵`; // High
  return `🟣`; // Very high/complete
}

export function getProgressColor(progress: number, nutrientType: "calories" | "protein" | "carbs" | "fat"): string {
  const isOverLimit = progress > 1;

  if (isOverLimit) {
    return PROGRESS_COLORS.OVER_LIMIT;
  }

  switch (nutrientType) {
    case "calories":
      return PROGRESS_COLORS.NORMAL;
    case "protein":
      return PROGRESS_COLORS.PROTEIN;
    case "carbs":
      return PROGRESS_COLORS.CARBS;
    case "fat":
      return PROGRESS_COLORS.FAT;
    default:
      return PROGRESS_COLORS.NORMAL;
  }
}

export function formatMealName(meal: string): string {
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

export function formatNutrientAmount(amount: number, unit: string = "g"): string {
  return `${Math.round(amount)}${unit}`;
}
