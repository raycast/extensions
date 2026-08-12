import { Color } from "@raycast/api";
import type { Food, FoodNutrition, MealType, Serving } from "./types";

export const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍿",
};

export const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function getDefaultMeal(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 21) return "dinner";
  return "snack";
}

export function formatMealType(meal: MealType): string {
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

export function mealColor(meal: MealType): Color {
  switch (meal) {
    case "breakfast":
      return Color.Orange;
    case "lunch":
      return Color.Yellow;
    case "dinner":
      return Color.Blue;
    case "snack":
      return Color.Purple;
  }
}

export function getDefaultServing(food: Food): Serving {
  if (food.servings.length > 0) {
    return food.servings[0]!;
  }
  return {
    id: "base",
    description: `${food.servingSize}${food.servingUnit}`,
    grams: food.servingSize,
    multiplier: 1,
  };
}

export function formatServingWithQuantity(serving: Serving, quantity: number): string {
  if (quantity === 1) return serving.description;
  return `${quantity} × ${serving.description}`;
}

export interface ScaledNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
}

/** Nutrition for `quantity × serving` of a food (per-base-serving values scaled). */
export function scaleNutrition(nutrition: FoodNutrition, serving: Serving, quantity: number): ScaledNutrition {
  const m = serving.multiplier * quantity;
  const round1 = (x: number) => Math.round(x * m * 10) / 10;
  return {
    calories: Math.round(nutrition.calories * m),
    protein: round1(nutrition.protein),
    carbs: round1(nutrition.carbs),
    fat: round1(nutrition.fat),
    fiber: nutrition.fiber != null ? round1(nutrition.fiber) : null,
    sugar: nutrition.sugar != null ? round1(nutrition.sugar) : null,
    sodium: nutrition.sodium != null ? Math.round(nutrition.sodium * m) : null,
  };
}

export function formatMacros(n: { protein: number; carbs: number; fat: number }): string {
  return `P ${n.protein}g · C ${n.carbs}g · F ${n.fat}g`;
}

export const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return Math.round((kg / KG_PER_LB) * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 10) / 10;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d);
}

export function formatDateSection(dateStr: string): string {
  if (dateStr === formatDate(new Date())) return "Today";
  if (dateStr === daysAgo(1)) return "Yesterday";

  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
