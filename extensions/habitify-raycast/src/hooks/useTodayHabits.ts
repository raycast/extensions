import { useCallback, useEffect, useRef, useState } from "react";
import { deleteCache, habitifyCacheKeys } from "../lib/cache";
import { loadTodayHabits } from "../lib/loadTodayHabits";
import { TodayHabit } from "../lib/habitify";
import { useHabitMutation } from "./useHabitMutation";

export function useTodayHabits(apiKey: string) {
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const habitsRef = useRef<TodayHabit[]>([]);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setIsLoading(true);
      setError(null);
      setCacheNotice(null);

      try {
        const result = await loadTodayHabits(apiKey);
        setHabits(result.habits);
        setCacheNotice(result.cacheNotice);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load Habitify habits.");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [apiKey],
  );

  useEffect(() => {
    void load();
  }, [load, refreshCounter]);

  const mutateHabit = useHabitMutation({
    apiKey,
    habitsRef,
    setHabits,
    reload: load,
  });

  const refresh = useCallback(() => {
    void deleteCache(habitifyCacheKeys.activeHabits);
    setRefreshCounter((c) => c + 1);
  }, []);

  return { habits, isLoading, error, cacheNotice, mutateHabit, refresh };
}
