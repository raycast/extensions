export type FoodSource = "openfoodfacts" | "usda" | "edamam" | "custom" | "ai" | "internal";

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
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  saturatedFat?: number | null;
}

export interface Food {
  id: string;
  externalId: string;
  source: FoodSource;
  barcode?: string;
  name: string;
  brand?: string | null;
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
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat?: number;
}

/**
 * Entry lifecycle. Pending states (`analyzing`, `needs_confirmation`) are
 * excluded from daily totals and the nutrition score.
 */
export type DiaryEntryStatus = "analyzing" | "needs_confirmation" | "confirmed";

export interface DiaryEntry {
  id: string;
  foodId?: string | null;
  foodKey?: string | null;
  food?: Food | null;
  servingId: string;
  quantity: number;
  meal: MealType;
  loggedAt: string;
  nutrition: DiaryEntryNutrition;
  status: DiaryEntryStatus;
  analysisText?: string | null;
}

export interface NutritionScore {
  value: number | null;
}

export interface UserGoals {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  saturatedFat?: number | null;
}

export interface DailySummary {
  date: string;
  totals: DiaryEntryNutrition;
  goals: UserGoals;
  entries: DiaryEntry[];
  score?: NutritionScore | null;
}

export type UnitSystem = "metric" | "imperial";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  goals: UserGoals;
  timezone: string;
  unitSystem: UnitSystem;
}

export type AIConfidence = "high" | "medium" | "low";

export type NutritionSource = "database" | "ai_estimated" | "label_extracted";

export interface TokenBalance {
  used: number;
  limit: number;
  resetsAt: string;
}

export interface AIFoodAnalysisResult {
  food: Food;
  foodKey: string;
  quantity?: number;
  confidence: AIConfidence;
  warnings?: string[];
  nutritionSource?: NutritionSource;
  /** True when the API flags the estimate for review (implausible or very high calories). */
  requiresConfirmation?: boolean;
  /** Persisted analysis id — pass back when logging so corrections feed the accuracy loop. */
  analysisId?: string;
}

export interface AnalyzeTextResponse {
  result: AIFoodAnalysisResult;
  tokenBalance?: TokenBalance;
}

export interface DiaryEntryInput {
  foodId: string;
  servingId: string;
  quantity: number;
  meal: MealType;
  loggedAt: string;
}

export interface DiaryEntryFromSnapshotInput {
  food: Food;
  foodKey: string;
  servingId: string;
  quantity: number;
  meal: MealType;
  loggedAt: string;
  aiAnalysisId?: string;
}

export interface UpdateDiaryEntryInput {
  servingId?: string;
  quantity?: number;
  meal?: MealType;
  status?: "confirmed";
}

export interface CopyMealInput {
  fromDate: string;
  toDate: string;
  meal: MealType;
}

export interface WeightEntry {
  id: string;
  weightKg: number;
  bodyFatPct?: number | null;
  note?: string | null;
  loggedDate: string;
  loggedAt: string;
  source: string;
}

export interface WeightStats {
  current: number | null;
  goal: number | null;
  change7d: number | null;
  ratePerWeek: number | null;
  streak: number;
  calorieAvg7d: number | null;
  bodyFatPct: number | null;
  weeklyInsight: string | null;
}
