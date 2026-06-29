import { Action, ActionPanel, Detail, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  completeHabit,
  formatTimeOfDayRange,
  getHabit,
  getHabitStatistics,
  Habit,
  HabitStatistics,
  habitStatusLabel,
  formatQuantity,
  skipHabit,
  sortTimeOfDays,
  TimeOfDay,
  undoHabit,
} from "../lib/habitify";
import { formatUTCDate } from "../lib/date";
import { formatHabitifyErrorMessage } from "../lib/errors";
import { formatCacheTimestamp, habitifyCacheKeys, latestCacheTimestamp, readCache, writeCache } from "../lib/cache";

type Props = {
  apiKey: string;
  habitId: string;
  habitName: string;
  onRefresh?: () => void;
};

function formatTimeOfDaySummary(timeOfDays: TimeOfDay[]) {
  if (timeOfDays.length === 0) {
    return "Any time";
  }

  return sortTimeOfDays(timeOfDays)
    .map((period) => `${period.name} (${formatTimeOfDayRange(period)})`)
    .join(" · ");
}

function buildMarkdown(habit: Habit | null, stats: HabitStatistics | null) {
  if (!habit || !stats) {
    return "Loading habit details…";
  }

  const unit = stats.unit?.symbol ?? habit.customUnitName ?? "";
  const goal = habit.goals.find((item) => item.isActive);
  const progressText = goal
    ? `${goal.value} ${goal.unit}${habit.logMethod === "auto" ? " (auto)" : ""}`
    : "No active goal";

  const statusEmoji: Record<string, string> = {
    completed: "✅",
    skipped: "⏭️",
    failed: "❌",
    inprogress: "⬜",
  };

  const recentProgress = (stats.dailyProgress ?? []).slice(-30).reverse();
  const recentMarkdown =
    recentProgress.length > 0
      ? recentProgress
          .map(
            (day) =>
              `- ${day.date}: ${statusEmoji[day.status] ?? "⬜"} ${habitStatusLabel(day.status)}${day.totalLog ? ` (${formatQuantity(day.totalLog, unit)})` : ""}`,
          )
          .join("\n")
      : "- No recent progress available";

  const timeOfDaySummary = formatTimeOfDaySummary(Array.isArray(habit.timeOfDays) ? habit.timeOfDays : []);

  return `# ${habit.name}\n\n- *Type:* ${habit.type}\n- *Status:* ${habit.isArchived ? "Archived" : "Active"}\n- *Start date:* ${habit.startDate}\n- *Schedule:* ${timeOfDaySummary}\n- *Goal:* ${progressText}\n- *Total logs:* ${formatQuantity(stats.totalLogs, "")}\n- *Completions:* ${stats.completions}\n- *Fails:* ${stats.fails}\n- *Skips:* ${stats.skips}\n- *Average:* ${formatQuantity(stats.avg, unit)}\n\n## Recent daily progress\n${recentMarkdown}`;
}

export default function HabitDetail({ apiKey, habitId, habitName, onRefresh }: Props) {
  const [habit, setHabit] = useState<Habit | null>(null);
  const [stats, setStats] = useState<HabitStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCacheNotice(null);

    try {
      const habitCacheKey = habitifyCacheKeys.habit(habitId);
      const statsCacheKey = habitifyCacheKeys.stats(habitId);
      const [cachedHabit, cachedStats] = await Promise.all([
        readCache<Habit>(habitCacheKey),
        readCache<HabitStatistics>(statsCacheKey),
      ]);

      if (cachedHabit) setHabit(cachedHabit.data);
      if (cachedStats) setStats(cachedStats.data);
      if (cachedHabit && cachedStats) {
        const cachedAt = latestCacheTimestamp(cachedHabit.savedAt, cachedStats.savedAt);
        setCacheNotice(cachedAt ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}` : "Showing cached data");
      }

      const [habitResponse, statsResponse] = await Promise.allSettled([
        getHabit(apiKey, habitId),
        getHabitStatistics(apiKey, habitId),
      ]);

      const liveHabit = habitResponse.status === "fulfilled" ? habitResponse.value.data : cachedHabit?.data;
      const liveStats = statsResponse.status === "fulfilled" ? statsResponse.value.data : cachedStats?.data;

      if (!liveHabit || !liveStats) {
        throw new Error(
          habitResponse.status === "rejected" && statsResponse.status === "rejected"
            ? "Habitify is unavailable and no cache exists yet."
            : "Habitify returned incomplete data.",
        );
      }

      setHabit(liveHabit);
      setStats(liveStats);

      if (habitResponse.status === "fulfilled") await writeCache(habitCacheKey, habitResponse.value.data);
      if (statsResponse.status === "fulfilled") await writeCache(statsCacheKey, statsResponse.value.data);

      if (habitResponse.status !== "fulfilled" || statsResponse.status !== "fulfilled") {
        const cachedAt = latestCacheTimestamp(cachedHabit?.savedAt, cachedStats?.savedAt);
        setCacheNotice(cachedAt ? `Showing cached data from ${formatCacheTimestamp(cachedAt)}` : "Showing cached data");
      } else {
        setCacheNotice(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load habit details.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, habitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const markdown = useMemo(() => {
    if (error) {
      return `# ${habitName}\n\n${error}`;
    }
    return buildMarkdown(habit, stats);
  }, [error, habit, habitName, stats]);

  const mutate = async (action: "complete" | "undo" | "skip") => {
    const targetDate = formatUTCDate(new Date());
    const titles: Record<typeof action, string> = {
      complete: "Completing habit…",
      undo: "Undoing habit…",
      skip: "Skipping habit…",
    };
    const toastPromise = showToast({
      style: Toast.Style.Animated,
      title: titles[action],
    });

    try {
      if (action === "complete") await completeHabit(apiKey, habitId, targetDate);
      else if (action === "undo") await undoHabit(apiKey, habitId, targetDate);
      else await skipHabit(apiKey, habitId, targetDate);

      const successTitles: Record<typeof action, string> = {
        complete: "Habit completed",
        undo: "Habit undone",
        skip: "Habit skipped",
      };
      const toast = await toastPromise;
      toast.style = Toast.Style.Success;
      toast.title = successTitles[action];
      toast.message = `Updated ${habitName} for ${targetDate}.`;
      await load();
      onRefresh?.();
    } catch (err) {
      const failTitles: Record<typeof action, string> = {
        complete: "Could not complete habit",
        undo: "Could not undo habit",
        skip: "Could not skip habit",
      };
      const toast = await toastPromise;
      toast.style = Toast.Style.Failure;
      toast.title = failTitles[action];
      toast.message = formatHabitifyErrorMessage(err);
    }
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={cacheNotice ? `${habitName} (cached)` : habitName}
      actions={
        <ActionPanel title={habitName}>
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={() => void load()} />
          <Action
            title="Mark Completed"
            icon={{ source: Icon.CheckCircle, tintColor: "#20B26B" }}
            onAction={() => void mutate("complete")}
          />
          <Action
            title="Skip"
            icon={Icon.ArrowRight}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => void mutate("skip")}
          />
          <Action title="Undo Today" icon={Icon.ArrowCounterClockwise} onAction={() => void mutate("undo")} />
        </ActionPanel>
      }
    />
  );
}
