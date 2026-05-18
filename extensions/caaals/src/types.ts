export type FoodSource = "openfoodfacts" | "usda" | "edamam" | "custom" | "ai";

export interface Serving {
  id: string;
  description: string;
  grams: number;
  multiplier: number;
}

export interface FoodNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface Food {
  id: string;
  externalId: string;
  source: FoodSource;
  barcode?: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  servings: Serving[];
  nutrition: FoodNutrition;
  isComplete: boolean;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface DiaryEntryNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DiaryEntry {
  id: string;
  foodId?: string;
  foodKey?: string;
  food: Food;
  servingId: string;
  quantity: number;
  meal: MealType;
  loggedAt: string;
  nutrition: DiaryEntryNutrition;
}

export interface DailySummary {
  date: string;
  totals: DiaryEntryNutrition;
  goals: DiaryEntryNutrition;
  entries: DiaryEntry[];
}

export type AIConfidence = "high" | "medium" | "low";

export interface AIFoodAnalysisResult {
  food: Food;
  quantity?: number;
  confidence: AIConfidence;
  warnings?: string[];
  foodKey: string;
}

export interface DiaryEntryFromSnapshotInput {
  food: Food;
  foodKey: string;
  servingId: string;
  quantity: number;
  meal: MealType;
  loggedAt: string;
}
