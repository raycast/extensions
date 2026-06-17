import { Image, Color } from "@raycast/api";
import { getProgressIcon as getRaycastProgressIcon } from "@raycast/utils";
import { isWindows } from "./platform";

export function getProgressIcon(
  progress: number,
  nutrientType: "calories" | "protein" | "carbs" | "fat",
): Image.ImageLike {
  const isOverLimit = progress > 1;

  if (isWindows) {
    // Hex fallback for Windows
    const HEX_COLORS = {
      NORMAL: "#007AFF",
      OVER_LIMIT: "#FF6347",
      PROTEIN: "#9C27B0",
      CARBS: "#FFC107",
      FAT: "#28A745",
    } as const;

    const tint = isOverLimit
      ? HEX_COLORS.OVER_LIMIT
      : nutrientType === "protein"
        ? HEX_COLORS.PROTEIN
        : nutrientType === "carbs"
          ? HEX_COLORS.CARBS
          : nutrientType === "fat"
            ? HEX_COLORS.FAT
            : HEX_COLORS.NORMAL;

    return getRaycastProgressIcon(progress, tint);
  }

  // Native Color on non-Windows
  const tint = isOverLimit
    ? Color.Red
    : nutrientType === "protein"
      ? Color.Purple
      : nutrientType === "carbs"
        ? Color.Yellow
        : nutrientType === "fat"
          ? Color.Green
          : Color.Blue;

  return getRaycastProgressIcon(progress, tint);
}

export function formatMealName(meal: string): string {
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

export function formatNutrientAmount(amount: number, unit: string = "g"): string {
  return `${Math.round(amount)}${unit}`;
}
