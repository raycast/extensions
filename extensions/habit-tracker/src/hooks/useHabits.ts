import { useState, useEffect, useCallback } from "react";
import { Habit, HabitStats, DayLog } from "../types/habit";
import { HabitService } from "../api/habitService";
import { showToast, Toast } from "@raycast/api";

export function useHabits() {
  const [habits, setHabits] = useState<
    (Habit & { stats: HabitStats; todayLog?: DayLog })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHabits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await HabitService.getHabitsWithStats();
      setHabits(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      showToast(Toast.Style.Failure, "Failed to load habits", msg);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  return { habits, isLoading, revalidate: loadHabits };
}
