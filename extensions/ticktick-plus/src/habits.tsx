import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getHabits, getHabitCheckins } from "./api/habits";
import { HabitItem } from "./components/HabitItem";
import { useAlerts } from "./hooks/useAlerts";

export default function Habits() {
  useAlerts();

  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const habits = await getHabits();
      const active = habits.filter((h) => h.status === 0 || h.status === undefined);
      const checkins = active.length > 0 ? await getHabitCheckins(active.map((h) => h.id)) : [];
      return { habits: active, checkins };
    },
    [],
    {
      keepPreviousData: true,
      failureToastOptions: {
        title: "Failed to load habits",
        message: "Habits may require TickTick Premium",
      },
    },
  );

  const habits = data?.habits ?? [];
  const checkins = data?.checkins ?? [];

  const checkinsByHabit = new Map<string, typeof checkins>();
  for (const c of checkins) {
    if (!checkinsByHabit.has(c.habitId)) checkinsByHabit.set(c.habitId, []);
    checkinsByHabit.get(c.habitId)!.push(c);
  }

  return (
    <List isLoading={isLoading} navigationTitle="Habits" searchBarPlaceholder="Search habits...">
      {habits.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No habits found"
          description="Create habits in TickTick, or they may require Premium."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open TickTick Web" url="https://ticktick.com/webapp/#p/habit" />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`${habits.length} habit${habits.length !== 1 ? "s" : ""}`}>
          {habits.map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              checkins={checkinsByHabit.get(habit.id) ?? []}
              onCheckin={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
