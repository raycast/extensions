// Shared type definitions for the Yazio Tracker extension

export interface Product {
  id: string;
  name: string;
  producer: string | null;
  nutrients: { "energy.energy": number };
}

export interface UserConsumedItem {
  id: string;
  product_id: string;
  daytime: "breakfast" | "lunch" | "dinner" | "snack";
  amount: number;
}

export interface RecipePortion {
  id: string;
  recipe_id: string;
  daytime: "breakfast" | "lunch" | "dinner" | "snack";
  portion_count: number;
  name: string;
  calories: number;
}

export type ConsumedItem =
  | (UserConsumedItem & { productDetails?: Product | null; type: "product" })
  | (RecipePortion & { type: "recipe" });

export interface ProductSearchResult {
  product_id: string;
  name: string;
  serving: string | null;
  serving_quantity: number | null;
}

// API response types (inferred from mockData.ts)
type LegacyUnits = { energy: string; weight: string; volume: string };
type ApiUnits = { unit_mass: string; unit_energy: string; unit_serving: string; unit_length: string };

export interface DailySummary {
  steps?: number;
  activity_energy?: number;
  consume_activity_energy?: boolean;
  water_intake?: number;
  goals?: {
    "energy.energy": number;
    "nutrient.carb": number;
    "nutrient.fat": number;
    "nutrient.protein": number;
    "activity.step": number;
    "bodyvalue.weight": number;
    water: number;
  };
  units?: LegacyUnits | ApiUnits;
  meals: {
    breakfast: { nutrients: Record<string, number> };
    lunch: { nutrients: Record<string, number> };
    dinner: { nutrients: Record<string, number> };
    snack: { nutrients: Record<string, number> };
  };
  activities?: { nutrients: Record<string, number> };
  user: User | null;
  active_fasting_countdown_template_key?: string | null;
}

export interface Goals {
  "energy.energy": number;
  "nutrient.protein": number;
  "nutrient.carb": number;
  "nutrient.fat": number;
  "activity.step": number;
  "bodyvalue.weight": number;
  water: number;
}

export interface User {
  diet?: {
    name?: string;
    protein_percentage: number;
    carb_percentage: number;
    fat_percentage: number;
  } | null;
  [key: string]: unknown; // Allow additional API properties without using any
}

// Meal types
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
