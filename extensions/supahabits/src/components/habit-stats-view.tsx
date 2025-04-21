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
    }
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderStreakCalendar = (streakData: { date: string; completed: boolean }[]) => {
    return streakData
      .map((day) => {
        const icon = day.completed ? "🟢" : "⚪️";
        return `${icon} ${formatDate(day.date)}`;
      })
      .join("\n");
  };

  const renderTrackHistory = (tracks: HabitStats["tracks"]) => {
    if (!tracks || tracks.length === 0) return "No tracking history";
    
    return tracks
      .slice(0, 10) // Show only the 10 most recent tracks
      .map((track) => {
        const source = track.source ? `(${track.source})` : "";
        return `- ${formatDate(track.completed_date)} ${source}`;
      })
      .join("\n");
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

## Last 30 days
${renderStreakCalendar(stats.streak_visualization)}

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