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

  const totalGoalCalories = summary.goals ? Math.round(summary.goals["energy.energy"]) : 0;
  const remainingCalories = totalGoalCalories - consumedCalories;
  const burnedCalories = summary.activity_energy || 0;

  let goalProtein = 0;
  let goalCarbs = 0;
  let goalFat = 0;

  if (goals) {
    const baseProteinGrams = goals["nutrient.protein"];
    const baseCarbGrams = goals["nutrient.carb"];
    const baseFatGrams = goals["nutrient.fat"];

    const proteinCalories = baseProteinGrams * 4.1;
    const carbCalories = baseCarbGrams * 4.1;
    const fatCalories = baseFatGrams * 9.3;

    const totalBaseCalories = proteinCalories + carbCalories + fatCalories;

    if (totalBaseCalories > 0) {
      const proteinPercentage = proteinCalories / totalBaseCalories;
      const carbPercentage = carbCalories / totalBaseCalories;
      const fatPercentage = fatCalories / totalBaseCalories;

      goalProtein = Math.round((totalGoalCalories * proteinPercentage) / 4.1);
      goalCarbs = Math.round((totalGoalCalories * carbPercentage) / 4.1);
      goalFat = Math.round((totalGoalCalories * fatPercentage) / 9.3);
    }
  }

  const calorieProgress = totalGoalCalories > 0 ? consumedCalories / totalGoalCalories : 0;
  const proteinProgress = goalProtein > 0 ? consumedProtein / goalProtein : 0;
  const carbsProgress = goalCarbs > 0 ? consumedCarbs / goalCarbs : 0;
  const fatProgress = goalFat > 0 ? consumedFat / goalFat : 0;
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
