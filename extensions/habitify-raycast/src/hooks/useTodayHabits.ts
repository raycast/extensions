import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteCache,
  formatCacheTimestamp,
  habitifyCacheKeys,
  latestCacheTimestamp,
  readCache,
  writeCache,
} from "../lib/cache";
import { formatUTCDate } from "../lib/date";
import {
  getHabits,
  getTodayJournal,
  mergeJournalWithHabits,
  TodayHabit,
} from "../lib/habitify";
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
        const today = formatUTCDate(new Date());
        const journalCacheKey = habitifyCacheKeys.todayJournal(today);
        const habitsCacheKey = habitifyCacheKeys.activeHabits;

        const [cachedJournal, cachedHabits] = await Promise.all([
          readCache<Awaited<ReturnType<typeof getTodayJournal>>>(
            journalCacheKey,
          ),
          readCache<Awaited<ReturnType<typeof getHabits>>>(habitsCacheKey),
        ]);

        if (cachedJournal && cachedHabits) {
          setHabits(
            mergeJournalWithHabits(cachedJournal.data.data, cachedHabits.data),
          );
          const cachedAt = latestCacheTimestamp(
            cachedJournal.savedAt,
            cachedHabits.savedAt,
          );
          setCacheNotice(
            cachedAt
              ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}`
              : "Showing cached data",
          );
        }

        const [journalResult, habitsResult] = await Promise.allSettled([
          getTodayJournal(apiKey, today),
          getHabits(apiKey, { archived: false }),
        ]);

        const journalData =
          journalResult.status === "fulfilled"
            ? journalResult.value.data
            : cachedJournal?.data.data;
        const habitCatalog =
          habitsResult.status === "fulfilled"
            ? habitsResult.value
            : cachedHabits?.data;

        if (!journalData || !habitCatalog) {
          throw new Error(
            journalResult.status === "rejected" &&
              habitsResult.status === "rejected"
              ? "Habitify is unavailable and no cache exists yet."
              : "Habitify returned incomplete data.",
          );
        }

        if (journalResult.status === "fulfilled")
          await writeCache(journalCacheKey, journalResult.value);
        if (habitsResult.status === "fulfilled")
          await writeCache(habitsCacheKey, habitsResult.value);

        setHabits(mergeJournalWithHabits(journalData, habitCatalog));

        const usedCache =
          journalResult.status !== "fulfilled" ||
          habitsResult.status !== "fulfilled";
        if (usedCache) {
          const cachedAt = latestCacheTimestamp(
            cachedJournal?.savedAt,
            cachedHabits?.savedAt,
          );
          setCacheNotice(
            cachedAt
              ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}`
              : "Showing cached data",
          );
        } else {
          setCacheNotice(null);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Habitify habits.",
        );
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
