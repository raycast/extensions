import { Image, Color } from "@raycast/api";
import { getProgressIcon as getRaycastProgressIcon } from "@raycast/utils";

export function getProgressIcon(
  progress: number,
  nutrientType: "calories" | "protein" | "carbs" | "fat",
): Image.ImageLike {
  const isOverLimit = progress > 1;
  let tint: Color;
  if (isOverLimit) {
    tint = Color.Red;
  } else {
    switch (nutrientType) {
      case "calories":
        tint = Color.Blue;
        break;
      case "protein":
        tint = Color.Purple;
        break;
      case "carbs":
        tint = Color.Yellow;
        break;
      case "fat":
        tint = Color.Green;
        break;
      default:
        tint = Color.Blue;
        break;
    }
  }

  return getRaycastProgressIcon(progress, tint);
}

export function formatMealName(meal: string): string {
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

export function formatNutrientAmount(amount: number, unit: string = "g"): string {
  return `${Math.round(amount)}${unit}`;
}
