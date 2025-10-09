import { Image } from "@raycast/api";
import { getProgressIcon as getRaycastProgressIcon } from "@raycast/utils";
import { PROGRESS_COLORS } from "../constants";

export function getProgressIcon(progress: number, nutrientType: "calories" | "protein" | "carbs" | "fat"): Image.Asset {
  const isOverLimit = progress > 1;
  let color: string;
  if (isOverLimit) {
    color = PROGRESS_COLORS.OVER_LIMIT;
  } else {
    switch (nutrientType) {
      case "calories":
        color = PROGRESS_COLORS.NORMAL;
        break;
      case "protein":
        color = PROGRESS_COLORS.PROTEIN;
        break;
      case "carbs":
        color = PROGRESS_COLORS.CARBS;
        break;
      case "fat":
        color = PROGRESS_COLORS.FAT;
        break;
      default:
        color = PROGRESS_COLORS.NORMAL;
        break;
    }
  }

  return getRaycastProgressIcon(progress, color);
}

export function formatMealName(meal: string): string {
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

export function formatNutrientAmount(amount: number, unit: string = "g"): string {
  return `${Math.round(amount)}${unit}`;
}
