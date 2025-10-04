import { List } from "@raycast/api";
import { getProgressIcon, usePromise } from "@raycast/utils";
import { useState } from "react";
import { yazio } from "./utils/yazio";
import { DateDropdown } from "./components/DateDropdown";
import { formatDate } from "./utils/utils";

export default function Command() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const { isLoading, data, error } = usePromise(
    async (date) => {
      const [summary, goals, user] = await Promise.all([
        yazio.user.getDailySummary({ date }),
        yazio.user.getGoals({ date }),
        yazio.user.get(),
      ]);
      return { summary, goals, user };
    },
    [selectedDate]
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Error"
          description={error.message}
          icon={{
            source: "https://api.raycast.com/api/v1/icons/raycast-error.png",
          }}
        />
      </List>
    );
  }

  // --- Base Values ---
  const consumedCalories = data ? Math.round(Object.values(data.summary.meals).reduce((total, meal) => total + meal.nutrients["energy.energy"], 0)) : 0;
  const consumedProtein = data ? Math.round(Object.values(data.summary.meals).reduce((total, meal) => total + meal.nutrients["nutrient.protein"], 0)) : 0;
  const consumedCarbs = data ? Math.round(Object.values(data.summary.meals).reduce((total, meal) => total + meal.nutrients["nutrient.carb"], 0)) : 0;
  const consumedFat = data ? Math.round(Object.values(data.summary.meals).reduce((total, meal) => total + meal.nutrients["nutrient.fat"], 0)) : 0;
  
  const burnedCalories = data ? Math.round(data.summary.activity_energy) : 0;
  
  // --- Goal Calculations ---
  const baseGoalCalories = data ? Math.round(data.goals["energy.energy"]) : 0;
  const totalGoalCalories = baseGoalCalories + burnedCalories;
  const remainingCalories = totalGoalCalories - consumedCalories;

  const { protein_percentage = 0, carb_percentage = 0, fat_percentage = 0 } = data?.user.diet || {};

  const extraProteinGrams = Math.round((burnedCalories * (protein_percentage / 100)) / 4);
  const extraCarbsGrams = Math.round((burnedCalories * (carb_percentage / 100)) / 4);
  const extraFatGrams = Math.round((burnedCalories * (fat_percentage / 100)) / 9);

  const goalProtein = (data ? Math.round(data.goals["nutrient.protein"]) : 0) + extraProteinGrams;
  const goalCarbs = (data ? Math.round(data.goals["nutrient.carb"]) : 0) + extraCarbsGrams;
  const goalFat = (data ? Math.round(data.goals["nutrient.fat"]) : 0) + extraFatGrams;

  // --- Progress Calculation ---
  const calorieProgress = totalGoalCalories > 0 ? consumedCalories / totalGoalCalories : 0;
  const clampedCalorieProgress = Math.max(0, Math.min(1, calorieProgress));

  const proteinProgress = goalProtein > 0 ? consumedProtein / goalProtein : 0;
  const clampedProteinProgress = Math.max(0, Math.min(1, proteinProgress));

  const carbsProgress = goalCarbs > 0 ? consumedCarbs / goalCarbs : 0;
  const clampedCarbsProgress = Math.max(0, Math.min(1, carbsProgress));

  const fatProgress = goalFat > 0 ? consumedFat / goalFat : 0;
  const clampedFatProgress = Math.max(0, Math.min(1, fatProgress));

  return (
    <List isLoading={isLoading} searchBarAccessory={<DateDropdown selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}>
      <List.Section title="Summary">
        <List.Item
          icon={getProgressIcon(
            clampedCalorieProgress,
            calorieProgress > 1 ? "#FF6347" : "#007AFF", // Tomato Red vs Blue
          )}
          title={`${remainingCalories} calories remaining`}
          accessories={[
            { text: `Consumed: ${consumedCalories}` },
            { text: `Goal: ${totalGoalCalories}` },
            { text: `Burned: ${burnedCalories}` },
          ]}
        />
      </List.Section>
      <List.Section title="Macronutrients">
        <List.Item
          icon={getProgressIcon(
            clampedProteinProgress,
            proteinProgress > 1 ? "#FF6347" : "#9C27B0", // Tomato Red vs Purple
          )}
          title="Protein"
          accessories={[{ text: `${consumedProtein}g / ${goalProtein}g` }]}
        />
        <List.Item
          icon={getProgressIcon(
            clampedCarbsProgress,
            carbsProgress > 1 ? "#FF6347" : "#FFC107", // Tomato Red vs Yellow
          )}
          title="Carbs"
          accessories={[{ text: `${consumedCarbs}g / ${goalCarbs}g` }]}
        />
        <List.Item
          icon={getProgressIcon(
            clampedFatProgress,
            fatProgress > 1 ? "#FF6347" : "#28A745", // Tomato Red vs Green
          )}
          title="Fat"
          accessories={[{ text: `${consumedFat}g / ${goalFat}g` }]}
        />
      </List.Section>
    </List>
  );
}