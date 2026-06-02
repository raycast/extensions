import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HabitDetail from "./components/HabitDetail";
import LogAmountForm from "./components/LogAmountForm";
import { formatUTCDate } from "./lib/date";
import { deleteCache, formatCacheTimestamp, habitifyCacheKeys, latestCacheTimestamp, readCache, writeCache } from "./lib/cache";
import {
  Area,
  completeHabit,
  deleteHabitLog,
  fetchHabitLogs,
  getAreas,
  getHabits,
  getTodayJournal,
  habitProgressLabel,
  habitStatusLabel,
  isHabitifyError,
  logHabitValue,
  mergeJournalWithHabits,
  resolveRowTint,
  skipHabit,
  statusIcon,
  statusTintColor,
  streakIcon,
  TodayHabit,
  undoHabit,
} from "./lib/habitify";

interface Preferences {
  apiKey: string;
  rowColorMode: "off" | "status" | "habit" | "area";
}


function AreaHabitsView({
  area,
  apiKey,
  rowColorMode,
}: {
  area: Area;
  apiKey: string;
  rowColorMode: Preferences["rowColorMode"];
}) {
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const habitsRef = useRef<TodayHabit[]>([]);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const loadHabits = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      setCacheNotice(null);

      try {
        const today = formatUTCDate(new Date());
        const journalCacheKey = habitifyCacheKeys.todayJournal(today);
        const habitsCacheKey = habitifyCacheKeys.habitsByArea(area.id);

        const [cachedJournal, cachedHabits] = await Promise.all([
          readCache<Awaited<ReturnType<typeof getTodayJournal>>>(journalCacheKey),
          readCache<Awaited<ReturnType<typeof getHabits>>>(habitsCacheKey),
        ]);

        if (cachedJournal && cachedHabits) {
          const cachedMerged = mergeJournalWithHabits(cachedJournal.data.data, cachedHabits.data);
          setHabits(cachedMerged);
          const cachedAt = latestCacheTimestamp(cachedJournal.savedAt, cachedHabits.savedAt);
          setCacheNotice(cachedAt ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}` : "Showing cached data");
        }

        const [journalResult, habitsResult] = await Promise.allSettled([
          getTodayJournal(apiKey, today),
          getHabits(apiKey, { archived: false, areaId: area.id }),
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

        if (journalResult.status === "fulfilled") {
          await writeCache(journalCacheKey, journalResult.value);
        }
        if (habitsResult.status === "fulfilled") {
          await writeCache(habitsCacheKey, habitsResult.value);
        }

        const merged = mergeJournalWithHabits(journalData, habitCatalog);
        setHabits(merged);

        const usedCache = journalResult.status !== "fulfilled" || habitsResult.status !== "fulfilled";
        if (usedCache) {
          const cachedAt = latestCacheTimestamp(cachedJournal?.savedAt, cachedHabits?.savedAt);
          setCacheNotice(cachedAt ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}` : "Showing cached data");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load area habits.");
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [apiKey, area.id],
  );

  useEffect(() => {
    void loadHabits();
  }, [loadHabits, refreshCounter]);

  const handleRefresh = useCallback(() => {
    void deleteCache(habitifyCacheKeys.habitsByArea(area.id));
    setRefreshCounter((v) => v + 1);
  }, [area.id]);

  const updateHabitStatus = useCallback((habitId: string, status: TodayHabit["status"]) => {
    setHabits((current) => current.map((habit) => (habit.id === habitId ? { ...habit, status } : habit)));
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
        void loadHabits({ silent: true });
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
    [apiKey, loadHabits, updateHabitStatus],
  );

  const emptyView = useMemo(() => {
    if (error) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load area habits"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              <Action title="Retry" onAction={handleRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.House}
        title={`No habits in ${area.name}`}
        description="This area does not have any active habits right now."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={handleRefresh} />
          </ActionPanel>
        }
      />
    );
  }, [area.name, error, handleRefresh]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={cacheNotice ? `${area.name} (cached)` : area.name}
      searchBarPlaceholder={`Search ${area.name.toLowerCase()} habits`}
    >
      {habits.length === 0 ? (
        emptyView
      ) : (
        habits.map((habit) => {
          const detail = habitProgressLabel(habit);
          const accessories: List.Item.Accessory[] = [
            { text: habitStatusLabel(habit.status), icon: { source: statusIcon(habit.status), tintColor: statusTintColor(habit.status) } },
          ];
          const rowTint = resolveRowTint(habit, rowColorMode);

          if (habit.currentStreak) {
            accessories.push({ text: `${habit.currentStreak.length}d`, icon: streakIcon() });
          }

          if (habit.currentTimeOfDay) {
            accessories.push({ text: habit.currentTimeOfDay.name, icon: { source: Icon.Clock } });
          }

          return (
            <List.Item
              key={habit.id}
              title={habit.name}
              subtitle={detail}
              icon={rowTint ? { source: statusIcon(habit.status), tintColor: rowTint } : statusIcon(habit.status)}
              accessories={accessories}
              actions={
                <ActionPanel title={habit.name}>
                  {habit.status === "completed" ? (
                    <Action
                      title="Undo Today"
                      icon={Icon.ArrowCounterClockwise}
                      onAction={() => void mutateHabit(habit.id, habit.name, "undo")}
                    />
                  ) : (
                    <Action
                      title="Mark Completed"
                      icon={{ source: Icon.CheckCircle, tintColor: "#20B26B" }}
                      onAction={() => void mutateHabit(habit.id, habit.name, "complete")}
                    />
                  )}
                  {habit.progress && (
                    <Action.Push
                      title="Log Amount"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                      target={<LogAmountForm habit={habit} apiKey={apiKey} onSuccess={handleRefresh} />}
                    />
                  )}
                  {habit.status === "inprogress" && (
                    <Action
                      title="Skip"
                      icon={Icon.ArrowRight}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => void mutateHabit(habit.id, habit.name, "skip")}
                    />
                  )}
                  {habit.progress && habit.progress.current > 0 && (
                    <Action
                      title="Remove Last Log"
                      icon={Icon.Minus}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                      onAction={() => void mutateHabit(habit.id, habit.name, "decrement")}
                    />
                  )}
                  <Action.Push
                    title="View Statistics"
                    icon={Icon.BarChart}
                    target={
                      <HabitDetail
                        apiKey={apiKey}
                        habitId={habit.id}
                        habitName={habit.name}
                        onRefresh={handleRefresh}
                      />
                    }
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    onAction={handleRefresh}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action.CopyToClipboard title="Copy Habit ID" content={habit.id} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

export default function Command() {
  const { apiKey, rowColorMode } = getPreferenceValues<Preferences>();
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const loadAreas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cachedAreas = await readCache<Area[]>(habitifyCacheKeys.areas);
      if (cachedAreas) {
        setAreas(cachedAreas.data);
        setCacheNotice(`Showing cached data from ${formatCacheTimestamp(cachedAreas.savedAt)}`);
      }

      const response = await getAreas(apiKey);
      setAreas(response.data);
      await writeCache(habitifyCacheKeys.areas, response.data);
      setCacheNotice(null);
    } catch (err) {
      const cachedAreas = await readCache<Area[]>(habitifyCacheKeys.areas);
      if (cachedAreas) {
        setAreas(cachedAreas.data);
        setCacheNotice(`Showing cached data from ${formatCacheTimestamp(cachedAreas.savedAt)}`);
      } else {
        setError(err instanceof Error ? err.message : "Unable to load Habitify areas.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas, refreshCounter]);

  const emptyView = useMemo(() => {
    if (error) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load Habitify areas"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              <Action title="Retry" onAction={handleRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.House}
        title="No areas found"
        description="Create areas in Habitify to organize your habits."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={() => setRefreshCounter((value) => value + 1)} />
          </ActionPanel>
        }
      />
    );
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={cacheNotice ? "Habit Areas (cached)" : "Habit Areas"}
      searchBarPlaceholder="Search areas"
    >
      {areas.length === 0 ? (
        emptyView
      ) : (
        areas.map((area) => (
          <List.Item
            key={area.id}
            title={area.name}
            icon={area.colorHex ? { source: Icon.House, tintColor: area.colorHex } : Icon.House}
            actions={
              <ActionPanel title={area.name}>
                  <Action.Push
                    title="Open Area Habits"
                    icon={Icon.ArrowRight}
                    target={<AreaHabitsView area={area} apiKey={apiKey} rowColorMode={rowColorMode} />}
                  />
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={() => setRefreshCounter((value) => value + 1)} />
                <Action.CopyToClipboard title="Copy Area ID" content={area.id} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
