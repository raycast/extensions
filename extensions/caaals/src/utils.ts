import type { Food, MealType, Serving } from "./types";

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

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateSection(dateStr: string): string {
  const today = formatDate(new Date());

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  if (dateStr === today) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";

  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
