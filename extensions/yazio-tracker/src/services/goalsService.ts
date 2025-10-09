// Business logic for daily goals calculations
import type { DailySummary, Goals } from "../types";
import { NUTRIENT_KEYS } from "../constants";

export interface GoalsCalculations {
  // Calorie calculations
  consumedCalories: number;
  totalGoalCalories: number;
  burnedCalories: number;
  remainingCalories: number;
  calorieProgress: number;
  clampedCalorieProgress: number;

  // Macronutrient calculations
  consumedProtein: number;
  goalProtein: number;
  proteinProgress: number;
  clampedProteinProgress: number;

  consumedCarbs: number;
  goalCarbs: number;
  carbsProgress: number;
  clampedCarbsProgress: number;

  consumedFat: number;
  goalFat: number;
  fatProgress: number;
  clampedFatProgress: number;
}

export function calculateDailyGoals(summary: DailySummary, goals: Goals): GoalsCalculations {
  // Calculate consumed nutrients from all meals
  const consumedCalories = Object.values(summary.meals).reduce(
    (total, meal) => total + (meal.nutrients[NUTRIENT_KEYS.ENERGY] || 0),
    0,
  );

  const consumedProtein = Object.values(summary.meals).reduce(
    (total, meal) => total + (meal.nutrients[NUTRIENT_KEYS.PROTEIN] || 0),
    0,
  );

  const consumedCarbs = Object.values(summary.meals).reduce(
    (total, meal) => total + (meal.nutrients[NUTRIENT_KEYS.CARBS] || 0),
    0,
  );

  const consumedFat = Object.values(summary.meals).reduce(
    (total, meal) => total + (meal.nutrients[NUTRIENT_KEYS.FAT] || 0),
    0,
  );

  // Get goals
  const goalCalories = goals[NUTRIENT_KEYS.ENERGY] || 0;
  const goalProtein = goals[NUTRIENT_KEYS.PROTEIN] || 0;
  const goalCarbs = goals[NUTRIENT_KEYS.CARBS] || 0;
  const goalFat = goals[NUTRIENT_KEYS.FAT] || 0;

  // Calculate burned calories
  const burnedCalories = Math.abs(summary.activities?.nutrients?.[NUTRIENT_KEYS.ENERGY] || 0);

  // Calculate adjusted goals and remaining
  const totalGoalCalories = goalCalories + burnedCalories;
  const remainingCalories = totalGoalCalories - consumedCalories;

  // Calculate progress ratios
  const calorieProgress = consumedCalories / totalGoalCalories;
  const proteinProgress = consumedProtein / goalProtein;
  const carbsProgress = consumedCarbs / goalCarbs;
  const fatProgress = consumedFat / goalFat;

  // Clamp progress for display (0-1 range)
  const clampedCalorieProgress = Math.min(Math.max(calorieProgress, 0), 1);
  const clampedProteinProgress = Math.min(Math.max(proteinProgress, 0), 1);
  const clampedCarbsProgress = Math.min(Math.max(carbsProgress, 0), 1);
  const clampedFatProgress = Math.min(Math.max(fatProgress, 0), 1);

  return {
    consumedCalories,
    totalGoalCalories,
    burnedCalories,
    remainingCalories,
    calorieProgress,
    clampedCalorieProgress,

    consumedProtein,
    goalProtein,
    proteinProgress,
    clampedProteinProgress,

    consumedCarbs,
    goalCarbs,
    carbsProgress,
    clampedCarbsProgress,

    consumedFat,
    goalFat,
    fatProgress,
    clampedFatProgress,
  };
}
