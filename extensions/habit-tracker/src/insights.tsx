import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useHabits } from "./hooks/useHabits";
import { HabitCalendar } from "./components/HabitCalendar";

export default function Command() {
  const { habits, isLoading } = useHabits();

  // Sort by streak
  const strongest = [...habits]
    .sort((a, b) => b.stats.current - a.stats.current)
    .slice(0, 3);

  // Weakest: Habits with lowest completion count OR current streak 0 (but only if they are old?)
  // Simple metric: Lowest current streak, but exclude new habits?
  // Let's just Sort by streak ascending.
  const weakest = [...habits]
    .sort((a, b) => a.stats.current - b.stats.current)
    .slice(0, 3);

  return (
    <List isLoading={isLoading} navigationTitle="Habit Insights">
      <List.Section title="🏆 Strongest Habits (Longest Current Streak)">
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
      <List.Section title="Needs Attention (Shortest Stream)">
        {weakest.map((h) => (
          <List.Item
            key={h.id}
            title={h.name}
            subtitle={`${h.stats.current} days`}
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
