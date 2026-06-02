import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteCache, formatCacheTimestamp, habitifyCacheKeys, latestCacheTimestamp, readCache, writeCache } from "../lib/cache";
import { formatUTCDate } from "../lib/date";
import {
  completeHabit,
  deleteHabitLog,
  fetchHabitLogs,
  getHabits,
  getTodayJournal,
  isHabitifyError,
  logHabitValue,
  mergeJournalWithHabits,
  skipHabit,
  TodayHabit,
  undoHabit,
} from "../lib/habitify";

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
          readCache<Awaited<ReturnType<typeof getTodayJournal>>>(journalCacheKey),
          readCache<Awaited<ReturnType<typeof getHabits>>>(habitsCacheKey),
        ]);

        if (cachedJournal && cachedHabits) {
          setHabits(mergeJournalWithHabits(cachedJournal.data.data, cachedHabits.data));
          const cachedAt = latestCacheTimestamp(cachedJournal.savedAt, cachedHabits.savedAt);
          setCacheNotice(cachedAt ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}` : "Showing cached data");
        }

        const [journalResult, habitsResult] = await Promise.allSettled([
          getTodayJournal(apiKey, today),
          getHabits(apiKey, { archived: false }),
        ]);

        const journalData = journalResult.status === "fulfilled" ? journalResult.value.data : cachedJournal?.data.data;
        const habitCatalog = habitsResult.status === "fulfilled" ? habitsResult.value : cachedHabits?.data;

        if (!journalData || !habitCatalog) {
          throw new Error(
            journalResult.status === "rejected" && habitsResult.status === "rejected"
              ? "Habitify is unavailable and no cache exists yet."
              : "Habitify returned incomplete data.",
          );
        }

        if (journalResult.status === "fulfilled") await writeCache(journalCacheKey, journalResult.value);
        if (habitsResult.status === "fulfilled") await writeCache(habitsCacheKey, habitsResult.value);

        setHabits(mergeJournalWithHabits(journalData, habitCatalog));

        const usedCache = journalResult.status !== "fulfilled" || habitsResult.status !== "fulfilled";
        if (usedCache) {
          const cachedAt = latestCacheTimestamp(cachedJournal?.savedAt, cachedHabits?.savedAt);
          setCacheNotice(cachedAt ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}` : "Showing cached data");
        } else {
          setCacheNotice(null);
        }
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

  const updateHabitStatus = useCallback((habitId: string, status: TodayHabit["status"]) => {
    setHabits((current) => current.map((h) => (h.id === habitId ? { ...h, status } : h)));
  }, []);

  const mutateHabit = useCallback(
    async (habitId: string, habitName: string, action: "complete" | "undo" | "skip" | "decrement") => {
      const targetDate = formatUTCDate(new Date());
      const rollbackSnapshot = habitsRef.current;

      const toastTitles: Record<typeof action, string> = {
        complete: "Completing habit…",
        undo: "Undoing habit…",
        skip: "Skipping habit…",
        decrement: "Removing last log…",
      };

      const toastPromise = showToast({ style: Toast.Style.Animated, title: toastTitles[action] });

      if (action === "complete") updateHabitStatus(habitId, "completed");
      else if (action === "undo") updateHabitStatus(habitId, "inprogress");
      else if (action === "skip") updateHabitStatus(habitId, "skipped");
      else {
        setHabits((current) =>
          current.map((h) => {
            if (h.id !== habitId || !h.progress) return h;
            const next = Math.max(0, h.progress.current - 1);
            return { ...h, progress: { ...h.progress, current: next }, status: next === 0 ? "inprogress" : h.status };
          }),
        );
      }

      try {
        if (action === "complete") await completeHabit(apiKey, habitId, targetDate);
        else if (action === "undo") await undoHabit(apiKey, habitId, targetDate);
        else if (action === "skip") await skipHabit(apiKey, habitId, targetDate);
        else {
          const habit = habitsRef.current.find((h) => h.id === habitId);
          const logs = await fetchHabitLogs(apiKey, habitId, targetDate);
          if (logs.length > 0) {
            const latest = [...logs].sort((a, b) => b.localLastModifiedDate - a.localLastModifiedDate)[0];
            await deleteHabitLog(apiKey, habitId, latest.id);
          } else {
            await undoHabit(apiKey, habitId, targetDate);
            const current = habit?.progress?.current ?? 0;
            if (current > 1) {
              const unitSymbol = habit?.progress?.unit ?? "";
              await logHabitValue(apiKey, habitId, current - 1, unitSymbol, targetDate);
            }
          }
        }

        const successTitles: Record<typeof action, string> = {
          complete: "Habit completed",
          undo: "Habit undone",
          skip: "Habit skipped",
          decrement: "Log removed",
        };
        const toast = await toastPromise;
        toast.style = Toast.Style.Success;
        toast.title = successTitles[action];
        toast.message = habitName;
        void load({ silent: true });
      } catch (err) {
        setHabits(rollbackSnapshot);
        const failTitles: Record<typeof action, string> = {
          complete: "Could not complete habit",
          undo: "Could not undo habit",
          skip: "Could not skip habit",
          decrement: "Could not remove log",
        };
        const toast = await toastPromise;
        toast.style = Toast.Style.Failure;
        toast.title = failTitles[action];
        toast.message = isHabitifyError(err)
          ? `Habitify returned ${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Unknown error";
      }
    },
    [apiKey, load, updateHabitStatus],
  );

  const refresh = useCallback(() => {
    void deleteCache(habitifyCacheKeys.activeHabits);
    setRefreshCounter((c) => c + 1);
  }, []);

  return { habits, isLoading, error, cacheNotice, mutateHabit, refresh };
}
