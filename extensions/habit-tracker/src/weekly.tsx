import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useHabits } from "./hooks/useHabits";
import { StorageService } from "./api/storage";
import { useState, useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  subWeeks,
} from "date-fns";
import { Habit } from "./types/habit";

export default function Command() {
  return <WeeklyReview />;
}

function WeeklyReview() {
  const { habits, isLoading } = useHabits();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week
  const [stats, setStats] = useState<
    { habit: Habit; completed: number; total: number }[]
  >([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const weekStart = startOfWeek(subWeeks(new Date(), -weekOffset), {
    weekStartsOn: 1,
  }); // Monday start
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "MMM d")} - ${format(
    weekEnd,
    "MMM d"
  )} `;

  useMemo(async () => {
    if (habits.length === 0) {
      setLoadingStats(false);
      return;
    }
    setLoadingStats(true);

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const newStats = [];

    for (const h of habits) {
      if (h.archived) continue;

      const logs = await StorageService.getLogs(h.id);
      let contextCompleted = 0;

      days.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        if (logs[dateStr]?.status === "completed") {
          contextCompleted++;
        }
      });

      newStats.push({
        habit: h,
        completed: contextCompleted,
        total: days.length, // usually 7
      });
    }

    // Sort by completion rate DESC
    newStats.sort((a, b) => b.completed - a.completed);

    setStats(newStats);
    setLoadingStats(false);
  }, [habits, weekOffset]);

  return (
    <List
      navigationTitle={`Weekly Review(${weekLabel})`}
      isLoading={isLoading || loadingStats}
      actions={
        <ActionPanel>
          <Action
            title="Previous Week"
            onAction={() => setWeekOffset((o) => o - 1)}
          />
          <Action
            title="Next Week"
            onAction={() => setWeekOffset((o) => o + 1)}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`Summary: ${weekLabel} `}>
        {stats.map((s) => {
          const rate = Math.round((s.completed / 7) * 100);
          let icon = Icon.Circle;
          let color = Color.Red;
          if (rate >= 80) {
            icon = Icon.CheckCircle;
            color = Color.Green;
          } else if (rate >= 50) {
            icon = Icon.Circle;
            color = Color.Yellow;
          }

          return (
            <List.Item
              key={s.habit.id}
              title={s.habit.name}
              subtitle={`${s.completed}/7 days (${rate}%)`}
              icon={{ source: icon, tintColor: color }}
              accessories={[{ text: s.completed.toString(), icon: Icon.Check }]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
