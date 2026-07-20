import { ActionPanel, Action, Detail, Icon, getPreferenceValues, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { HabitStats } from "../models/habit-stats";
import { Habit } from "../models/habit";

interface HabitStatsViewProps {
  habit: Habit;
}

export default function HabitStatsView({ habit }: HabitStatsViewProps) {
  const { secret } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  const { isLoading, data: habitStats } = useFetch<HabitStats>(
    `https://www.supahabits.com/api/habits/${habit.id}/stats/?secret=${secret}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
    },
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
  };

  const renderStreakTimeline = (streakData: { date: string; completed: boolean }[]) => {
    if (!streakData || streakData.length === 0) return "No streak data available";

    // Group days by week for better visualization
    const weeks: { date: string; completed: boolean }[][] = [];
    let currentWeek: { date: string; completed: boolean }[] = [];

    streakData.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === streakData.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    // Format each week
    return weeks
      .map((week) => {
        const weekStart = formatShortDate(week[0].date);
        const weekEnd = formatShortDate(week[week.length - 1].date);

        // Create a row of emojis for the days
        const dayIcons = week.map((day) => (day.completed ? "🟢" : "⚪️")).join(" ");

        // Create a row of short dates
        const dayDates = week
          .map((day) => {
            const shortDate = formatShortDate(day.date).split("/")[1]; // Just get the day number
            return shortDate.padStart(2, " ");
          })
          .join(" ");

        return `### ${weekStart} - ${weekEnd}\n\n${dayIcons}\n${dayDates}`;
      })
      .join("\n\n");
  };

  const renderTrackHistory = (tracks: HabitStats["tracks"]) => {
    if (!tracks || tracks.length === 0) return "No tracking history";

    // Create table header
    let tableContent = "| Date | Source | Created At |\n";
    tableContent += "|------|--------|------------|\n";

    // Add table rows for the 10 most recent tracks
    tracks.slice(0, 10).forEach((track) => {
      const source = track.source || "-";
      const formattedDate = formatDate(track.completed_date);
      const createdAt = new Date(track.created_at).toLocaleString();

      tableContent += `| ${formattedDate} | ${source} | ${createdAt} |\n`;
    });

    return tableContent;
  };

  const getMarkdownContent = () => {
    if (isLoading) {
      return "# Loading stats...";
    }

    if (!habitStats) {
      return "# Failed to load habit stats";
    }

    const { habit: habitData, stats } = habitStats;

    return `# ${habitData.name} Stats

## Summary
- **Total completions:** ${stats.total_completions}
- **Current streak:** ${stats.current_streak} days
- **Longest streak:** ${stats.longest_streak} days
- **Completion rate:** ${stats.completion_rate}%

## Last 30 days Timeline
${renderStreakTimeline(stats.streak_visualization)}

## Recent tracking history
${renderTrackHistory(habitStats.tracks)}
    `;
  };

  return (
    <Detail
      markdown={getMarkdownContent()}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Back to Habits" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.OpenInBrowser
            title="View Detailed Stats Online"
            url={`https://www.supahabits.com/dashboard/stats/${habit.id}`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
