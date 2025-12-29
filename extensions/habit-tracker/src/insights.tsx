import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useHabits } from "./hooks/useHabits";
import { HabitCalendar } from "./components/HabitCalendar";

export default function Command() {
  const { habits, isLoading } = useHabits();

  const strongest = [...habits]
    .sort((a, b) => b.stats.current - a.stats.current)
    .slice(0, 3);

  // Sort by longest streak ever
  const longestEver = [...habits]
    .sort((a, b) => b.stats.longest - a.stats.longest)
    .slice(0, 3);

  // Weakest: Lowest current streak
  const weakest = [...habits]
    .sort((a, b) => a.stats.current - b.stats.current)
    .slice(0, 3);

  return (
    <List isLoading={isLoading} navigationTitle="Habit Insights">
      <List.Section title="🔥 Best Current Streaks">
        {strongest.map((h) => (
          <List.Item
            key={h.id}
            title={h.name}
            subtitle={`${h.stats.current} days`}
            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Calendar"
                  icon={Icon.Calendar}
                  target={<HabitCalendar habit={h} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="🏆 Longest Streaks Ever">
        {longestEver.map((h) => (
          <List.Item
            key={h.id}
            title={h.name}
            subtitle={`${h.stats.longest} days (current: ${h.stats.current})`}
            icon={{ source: Icon.Trophy, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Calendar"
                  icon={Icon.Calendar}
                  target={<HabitCalendar habit={h} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="⚠️ Needs Attention (Shortest Streak)">
        {weakest.map((h) => (
          <List.Item
            key={h.id}
            title={h.name}
            subtitle={`${h.stats.current} days (best: ${h.stats.longest})`}
            icon={{ source: Icon.Warning, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Calendar"
                  icon={Icon.Calendar}
                  target={<HabitCalendar habit={h} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
