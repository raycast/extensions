import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUTCDate } from "./lib/date";
import { habitifyCacheKeys, readCache, writeCache } from "./lib/cache";
import { loadTodayHabits } from "./lib/loadTodayHabits";
import {
  getTodayJournal,
  habitStatusLabel,
  Habit,
  mergeJournalWithHabits,
  statusIcon,
  statusTintColor,
  streakIcon,
  TodayHabit,
} from "./lib/habitify";

type Summary = {
  total: number;
  completed: number;
  inprogress: number;
  skipped: number;
  failed: number;
};

type TodayJournalResponse = Awaited<ReturnType<typeof getTodayJournal>>;

function computeSummary(habits: TodayHabit[]): Summary {
  return habits.reduce<Summary>(
    (acc, habit) => {
      acc.total += 1;
      acc[habit.status] += 1;
      return acc;
    },
    { total: 0, completed: 0, inprogress: 0, skipped: 0, failed: 0 },
  );
}

function getDatesForWeek(): string[] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = today.getUTCDay();
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((day === 0 ? 7 : day) - 1));
  const dates: string[] = [];
  const current = new Date(monday);
  while (current <= today) {
    dates.push(formatUTCDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function getDatesForMonth(): string[] {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const dates: string[] = [];
  const current = new Date(first);
  while (current <= today) {
    dates.push(formatUTCDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

async function getJournalForDate(apiKey: string, date: string): Promise<TodayJournalResponse | null> {
  const cacheKey = habitifyCacheKeys.todayJournal(date);
  const cachedJournal = await readCache<TodayJournalResponse>(cacheKey);
  if (cachedJournal) {
    return cachedJournal.data;
  }

  try {
    const freshJournal = await getTodayJournal(apiKey, date);
    await writeCache(cacheKey, freshJournal);
    return freshJournal;
  } catch {
    return null;
  }
}

async function fetchMultipleJournals(apiKey: string, dates: string[], habitCatalog: Habit[]): Promise<TodayHabit[]> {
  const results = await Promise.all(dates.map((date) => getJournalForDate(apiKey, date)));
  return results.flatMap((journal) => (journal ? mergeJournalWithHabits(journal.data, habitCatalog) : []));
}

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [weekHabits, setWeekHabits] = useState<TodayHabit[]>([]);
  const [monthHabits, setMonthHabits] = useState<TodayHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCacheNotice(null);

    try {
      const today = formatUTCDate(new Date());
      const { habits: merged, habitCatalog, cacheNotice: notice } = await loadTodayHabits(apiKey);
      setHabits(merged);
      setCacheNotice(notice);

      const weekDates = getDatesForWeek().filter((d) => d !== today);
      const monthDates = getDatesForMonth().filter((d) => d !== today);

      const [weekEntries, monthEntries] = await Promise.all([
        fetchMultipleJournals(apiKey, weekDates, habitCatalog),
        fetchMultipleJournals(apiKey, monthDates, habitCatalog),
      ]);

      setWeekHabits([...merged, ...weekEntries]);
      setMonthHabits([...merged, ...monthEntries]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Habitify statistics.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    void load();
  }, [load, refreshCounter]);

  const summary = useMemo(() => computeSummary(habits), [habits]);
  const weekSummary = useMemo(() => computeSummary(weekHabits), [weekHabits]);
  const monthSummary = useMemo(() => computeSummary(monthHabits), [monthHabits]);

  const completionRate = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
  const weekRate = weekSummary.total > 0 ? Math.round((weekSummary.completed / weekSummary.total) * 100) : 0;
  const monthRate = monthSummary.total > 0 ? Math.round((monthSummary.completed / monthSummary.total) * 100) : 0;

  const summaryText = `Today: ${summary.completed}/${summary.total} completed, ${summary.inprogress} in progress, ${summary.skipped} skipped, ${summary.failed} failed.`;

  const streakHabits = useMemo(() => {
    return habits
      .filter((habit) => (habit.currentStreak?.length ?? 0) > 0)
      .sort(
        (left, right) =>
          (right.currentStreak?.length ?? 0) - (left.currentStreak?.length ?? 0) || left.name.localeCompare(right.name),
      );
  }, [habits]);

  const byArea = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; completed: number }>();
    for (const habit of habits) {
      const areas = habit.areas.length > 0 ? habit.areas : [{ id: "no-area", name: "No Area" }];
      for (const area of areas) {
        const existing = map.get(area.id) ?? {
          id: area.id,
          name: area.name,
          count: 0,
          completed: 0,
        };
        existing.count += 1;
        existing.completed += habit.status === "completed" ? 1 : 0;
        map.set(area.id, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [habits]);

  const byTimeOfDay = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; completed: number }>();
    for (const habit of habits) {
      const periods = habit.timeOfDays.length > 0 ? habit.timeOfDays : [{ id: "anytime", name: "Any time" }];
      for (const period of periods) {
        const existing = map.get(period.id) ?? {
          id: period.id,
          name: period.name,
          count: 0,
          completed: 0,
        };
        existing.count += 1;
        existing.completed += habit.status === "completed" ? 1 : 0;
        map.set(period.id, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [habits]);

  const emptyView = useMemo(() => {
    if (!error) {
      return (
        <List.EmptyView
          icon={Icon.BarChart}
          title="No habits found"
          description="Habitify did not return any habits for today."
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={() => setRefreshCounter((value) => value + 1)} />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Unable to load Habitify"
        description={error}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action title="Retry" onAction={() => setRefreshCounter((value) => value + 1)} />
          </ActionPanel>
        }
      />
    );
  }, [error]);

  function sharedActions() {
    return (
      <ActionPanel>
        <Action title="Refresh" icon={Icon.RotateClockwise} onAction={() => setRefreshCounter((value) => value + 1)} />
        <Action.CopyToClipboard title="Copy Summary" content={summaryText} />
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel>
    );
  }

  const navigationTitle = cacheNotice ? "Today Stats (cached)" : "Today Stats";

  return (
    <List isLoading={isLoading} navigationTitle={navigationTitle} searchBarPlaceholder="Search stats">
      {habits.length === 0 ? (
        emptyView
      ) : (
        <>
          <List.Section title="Today" subtitle={`${completionRate}% completed`}>
            <List.Item
              title="Completed"
              actions={sharedActions()}
              accessories={[
                {
                  text: `${summary.completed}/${summary.total}`,
                  icon: {
                    source: statusIcon("completed"),
                    tintColor: statusTintColor("completed"),
                  },
                },
              ]}
            />
            <List.Item
              title="In Progress"
              actions={sharedActions()}
              accessories={[
                {
                  text: `${summary.inprogress}/${summary.total}`,
                  icon: {
                    source: statusIcon("inprogress"),
                    tintColor: statusTintColor("inprogress"),
                  },
                },
              ]}
            />
            <List.Item
              title="Skipped"
              actions={sharedActions()}
              accessories={[
                {
                  text: `${summary.skipped}/${summary.total}`,
                  icon: {
                    source: statusIcon("skipped"),
                    tintColor: statusTintColor("skipped"),
                  },
                },
              ]}
            />
            <List.Item
              title="Failed"
              actions={sharedActions()}
              accessories={[
                {
                  text: `${summary.failed}/${summary.total}`,
                  icon: {
                    source: statusIcon("failed"),
                    tintColor: statusTintColor("failed"),
                  },
                },
              ]}
            />
          </List.Section>

          {weekHabits.length > 0 && (
            <List.Section title="This Week" subtitle={`${weekRate}% completed`}>
              <List.Item
                title="Completed"
                actions={sharedActions()}
                accessories={[
                  {
                    text: `${weekSummary.completed}/${weekSummary.total}`,
                    icon: {
                      source: statusIcon("completed"),
                      tintColor: statusTintColor("completed"),
                    },
                  },
                ]}
              />
              <List.Item
                title="Skipped"
                actions={sharedActions()}
                accessories={[
                  {
                    text: `${weekSummary.skipped}`,
                    icon: {
                      source: statusIcon("skipped"),
                      tintColor: statusTintColor("skipped"),
                    },
                  },
                ]}
              />
              <List.Item
                title="Failed"
                actions={sharedActions()}
                accessories={[
                  {
                    text: `${weekSummary.failed}`,
                    icon: {
                      source: statusIcon("failed"),
                      tintColor: statusTintColor("failed"),
                    },
                  },
                ]}
              />
            </List.Section>
          )}

          {monthHabits.length > 0 && (
            <List.Section title="This Month" subtitle={`${monthRate}% completed`}>
              <List.Item
                title="Completed"
                actions={sharedActions()}
                accessories={[
                  {
                    text: `${monthSummary.completed}/${monthSummary.total}`,
                    icon: {
                      source: statusIcon("completed"),
                      tintColor: statusTintColor("completed"),
                    },
                  },
                ]}
              />
              <List.Item
                title="Skipped"
                actions={sharedActions()}
                accessories={[
                  {
                    text: `${monthSummary.skipped}`,
                    icon: {
                      source: statusIcon("skipped"),
                      tintColor: statusTintColor("skipped"),
                    },
                  },
                ]}
              />
              <List.Item
                title="Failed"
                actions={sharedActions()}
                accessories={[
                  {
                    text: `${monthSummary.failed}`,
                    icon: {
                      source: statusIcon("failed"),
                      tintColor: statusTintColor("failed"),
                    },
                  },
                ]}
              />
            </List.Section>
          )}

          <List.Section title="Streaks" subtitle={streakHabits.length ? `${streakHabits.length} active` : "None"}>
            {streakHabits.length === 0 ? (
              <List.Item title="No active streaks" actions={sharedActions()} />
            ) : (
              streakHabits.slice(0, 15).map((habit) => (
                <List.Item
                  key={habit.id}
                  title={habit.name}
                  subtitle={habitStatusLabel(habit.status)}
                  icon={statusIcon(habit.status)}
                  actions={sharedActions()}
                  accessories={[
                    {
                      text: `${habit.currentStreak?.length ?? 0}d`,
                      icon: streakIcon(),
                    },
                  ]}
                />
              ))
            )}
          </List.Section>

          <List.Section title="By Time of Day">
            {byTimeOfDay.map((period) => (
              <List.Item
                key={period.id}
                title={period.name}
                actions={sharedActions()}
                accessories={[
                  {
                    text: `${period.completed}/${period.count} completed`,
                    icon: { source: Icon.CheckCircle, tintColor: "#20B26B" },
                  },
                ]}
              />
            ))}
          </List.Section>

          <List.Section title="By Area">
            {byArea.map((area) => (
              <List.Item
                key={area.id}
                title={area.name}
                actions={sharedActions()}
                accessories={[
                  {
                    text: `${area.completed}/${area.count} completed`,
                    icon: { source: Icon.CheckCircle, tintColor: "#20B26B" },
                  },
                ]}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
