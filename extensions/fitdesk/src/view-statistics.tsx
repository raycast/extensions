import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getExerciseHistory,
  getExercisesToday,
  getExercisesThisWeek,
  getExercisesThisMonth,
  getStreak,
  clearHistory,
  CompletedExercise,
} from "./storage";
import { categoryLabels, categoryIcons, Category } from "./exercises";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function getCategoryStats(
  exercises: CompletedExercise[],
): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const exercise of exercises) {
    stats[exercise.category] = (stats[exercise.category] || 0) + 1;
  }
  return stats;
}

function getTotalDuration(exercises: CompletedExercise[]): number {
  return exercises.reduce((total, e) => total + (e.duration || 0), 0);
}

function getTotalReps(exercises: CompletedExercise[]): number {
  return exercises.reduce((total, e) => total + (e.reps || 0), 0);
}

export default function ViewStatistics() {
  const [history, setHistory] = useState<CompletedExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    const data = await getExerciseHistory();
    setHistory(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (
      await confirmAlert({
        title: "Clear History",
        message: "Are you sure you want to clear all exercise history?",
        primaryAction: {
          title: "Clear",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await clearHistory();
      setHistory([]);
    }
  };

  const today = getExercisesToday(history);
  const thisWeek = getExercisesThisWeek(history);
  const thisMonth = getExercisesThisMonth(history);
  const streak = getStreak(history);

  const weeklyStats = getCategoryStats(thisWeek);
  const totalDurationWeek = getTotalDuration(thisWeek);
  const totalRepsWeek = getTotalReps(thisWeek);

  // Build category breakdown
  const categoryBreakdown = (Object.keys(categoryLabels) as Category[])
    .map((cat) => {
      const count = weeklyStats[cat] || 0;
      if (count === 0) return null;
      return `- ${categoryIcons[cat]} ${categoryLabels[cat]}: **${count}** exercise${count !== 1 ? "s" : ""}`;
    })
    .filter(Boolean)
    .join("\n");

  // Recent exercises (last 5)
  const recentExercises = history
    .slice(0, 5)
    .map((e) => {
      const date = new Date(e.completedAt);
      const timeStr = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = date.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const amount = e.duration ? formatDuration(e.duration) : `${e.reps} reps`;
      return `| ${categoryIcons[e.category as Category] || "🏃"} ${e.exerciseName} | ${amount} | ${dateStr} ${timeStr} |`;
    })
    .join("\n");

  // Motivational message based on streak
  let streakMessage = "";
  if (streak === 0) {
    streakMessage = "Start your exercise streak today!";
  } else if (streak === 1) {
    streakMessage = "Great start! Keep it going tomorrow.";
  } else if (streak < 7) {
    streakMessage = `${streak} days in a row! You're on the right track.`;
  } else if (streak < 30) {
    streakMessage = `${streak} days! You're unstoppable!`;
  } else {
    streakMessage = `${streak} days! You're a fitness legend!`;
  }

  const markdown = `
# FitDesk Statistics

## Summary

| Period | Exercises |
|--------|-----------|
| Today | **${today.length}** |
| This week | **${thisWeek.length}** |
| This month | **${thisMonth.length}** |
| All time | **${history.length}** |

---

## Current Streak

# ${streak} ${streak === 1 ? "day" : "days"} 🔥

*${streakMessage}*

---

## This Week

${
  thisWeek.length > 0
    ? `
**Total time:** ${formatDuration(totalDurationWeek)}

**Total reps:** ${totalRepsWeek}

### By Category

${categoryBreakdown || "*No exercises this week*"}
`
    : "*You haven't exercised this week. Time to start!*"
}

---

## Recent Exercises

${
  history.length > 0
    ? `
| Exercise | Amount | Date |
|----------|--------|------|
${recentExercises}
`
    : "*No exercises in history*"
}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={loadHistory}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {history.length > 0 && (
            <Action
              title="Clear History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleClearHistory}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
