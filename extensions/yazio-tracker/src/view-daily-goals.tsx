// Optimized daily goals view with extracted business logic
import { List } from "@raycast/api";
import { useMemo, useState } from "react";
import { yazio } from "./utils/yazio";
import { DateDropdown } from "./components/DateDropdown";
import { ErrorView } from "./components/ErrorView";
import { ProgressItem } from "./components/ui/ProgressItem";
import { DevelopmentProvider, useDevelopmentMode } from "./contexts/DevelopmentContext";
import { useYazioApi } from "./hooks/useYazioApi";
import { calculateDailyGoals } from "./services/goalsService";
import { formatDate } from "./utils/utils";
import { mockDailySummary, mockGoals, mockUser } from "./utils/mockData";
import type { DailySummary, Goals, User } from "./types";

type DailyData = { summary: DailySummary; goals: Goals; user: User };

function DailyGoalsContent() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const isDev = useDevelopmentMode();

  const { isLoading, data, error } = useYazioApi<DailyData, [string]>({
    apiCall: async (date: string): Promise<DailyData> => {
      const [summary, goals, user] = await Promise.all([
        yazio.user.getDailySummary({ date }),
        yazio.user.getGoals({ date }),
        yazio.user.get(),
      ]);
      return { summary, goals, user };
    },
    mockData: (): DailyData => ({
      summary: mockDailySummary,
      goals: mockGoals,
      user: mockUser,
    }),
    args: [selectedDate],
    isDevelopment: isDev,
  });

  // Calculate all goal-related metrics using the service
  const calculations = useMemo(() => (data ? calculateDailyGoals(data.summary, data.goals) : null), [data]);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={<DateDropdown selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
    >
      <ErrorView error={error} />

      {calculations && (
        <>
          <List.Section title="Summary">
            <ProgressItem
              title={`${Math.round(calculations.remainingCalories)} calories remaining`}
              progress={calculations.calorieProgress}
              current={calculations.consumedCalories}
              goal={calculations.totalGoalCalories}
              unit="kcal"
              nutrientType="calories"
              accessories={[
                { text: `Consumed: ${Math.round(calculations.consumedCalories)}` },
                { text: `Goal: ${Math.round(calculations.totalGoalCalories)}` },
                { text: `Burned: ${Math.round(calculations.burnedCalories)}` },
              ]}
            />
          </List.Section>

          <List.Section title="Macronutrients">
            <ProgressItem
              title="Protein"
              progress={calculations.proteinProgress}
              current={calculations.consumedProtein}
              goal={calculations.goalProtein}
              nutrientType="protein"
            />

            <ProgressItem
              title="Carbs"
              progress={calculations.carbsProgress}
              current={calculations.consumedCarbs}
              goal={calculations.goalCarbs}
              nutrientType="carbs"
            />

            <ProgressItem
              title="Fat"
              progress={calculations.fatProgress}
              current={calculations.consumedFat}
              goal={calculations.goalFat}
              nutrientType="fat"
            />
          </List.Section>
        </>
      )}
    </List>
  );
}

export default function Command() {
  return (
    <DevelopmentProvider>
      <DailyGoalsContent />
    </DevelopmentProvider>
  );
}
