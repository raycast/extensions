import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { CreateHabitForm } from "./components/CreateHabitForm";
import { useHabits } from "./hooks/useHabits";

import { subDays, format } from "date-fns";
import { Habit } from "./types/habit";
import { useState, useMemo } from "react";
import { StorageService } from "./api/storage";
import { HabitService } from "./api/habitService";

export default function Command() {
  return <MissedList />;
}

function MissedList() {
  const { habits, isLoading, revalidate } = useHabits();
  const [misses, setMisses] = useState<
    { habit: Habit; date: string; dateLabel: string }[]
  >([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useMemo(async () => {
    if (habits.length === 0) {
      setLoadingLogs(false);
      return;
    }

    const missing: { habit: Habit; date: string; dateLabel: string }[] = [];

    for (const h of habits) {
      if (h.archived || h.is_paused) continue;

      const logs = await StorageService.getLogs(h.id);
      // Check last 3 days for now
      for (let i = 1; i <= 3; i++) {
        const d = subDays(new Date(), i);
        const dateStr = format(d, "yyyy-MM-dd");

        if (!logs[dateStr]) {
          missing.push({
            habit: h,
            date: dateStr,
            dateLabel: format(d, "EEEE, MMM d"),
          });
        }
      }
    }

    // Sort by date desc
    missing.sort((a, b) => b.date.localeCompare(a.date));
    setMisses(missing);
    setLoadingLogs(false);
  }, [habits]);

  async function handleLog(habit: Habit, date: string) {
    await HabitService.logHabit(habit.id, "completed", date);
    revalidate();
  }

  async function handleSkip(habit: Habit, date: string) {
    await HabitService.logHabit(habit.id, "skipped", date);
    revalidate();
  }

  if (isLoading || loadingLogs) return <List isLoading={true} />;

  return (
    <List navigationTitle="Missed Habits (Last 3 Days)">
      {misses.length === 0 ? (
        <List.EmptyView title="No missed habits!" icon={Icon.CheckCircle} />
      ) : (
        misses.map((item) => (
          <List.Item
            key={`${item.habit.id}-${item.date}`}
            title={item.habit.name}
            subtitle={item.dateLabel}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action
                  title="Log Completed"
                  icon={Icon.Check}
                  onAction={() => handleLog(item.habit, item.date)}
                />
                <Action
                  title="Skip"
                  icon={Icon.Minus}
                  onAction={() => handleSkip(item.habit, item.date)}
                />
                <Action.Push
                  title="Add Habit"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreateHabitForm onRevalidate={revalidate} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
