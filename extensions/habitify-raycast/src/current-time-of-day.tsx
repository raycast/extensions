import { Icon, List, getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import { HabitEmptyStateView, HabitLoadErrorEmptyView } from "./components/HabitEmptyViews";
import HabitListItem from "./components/HabitListItem";
import { formatTimeOfDayRange, splitHabitsByPeriodicity } from "./lib/habitify";
import { useTodayHabits } from "./hooks/useTodayHabits";

export default function Command() {
  const { apiKey, rowColorMode } = getPreferenceValues<Preferences>();
  const { habits: allHabits, isLoading, error, cacheNotice, mutateHabit, refresh } = useTodayHabits(apiKey);

  const { daily, weekly, monthly } = useMemo(() => splitHabitsByPeriodicity(allHabits), [allHabits]);
  const habits = useMemo(() => daily.filter((h) => h.currentTimeOfDay !== null), [daily]);

  const hasAnyHabits = habits.length > 0 || weekly.length > 0 || monthly.length > 0;

  const emptyView = useMemo(() => {
    if (error) {
      return <HabitLoadErrorEmptyView error={error} onRetry={refresh} />;
    }

    return (
      <HabitEmptyStateView
        icon={Icon.Clock}
        title="No habits due right now"
        description="Habitify does not have any habits scheduled for the current time of day."
        onRefresh={refresh}
      />
    );
  }, [error, refresh]);

  const currentPeriod = habits[0]?.currentTimeOfDay ?? null;
  const currentLabel = currentPeriod?.name ?? "Current Time of Day";

  return (
    <List
      isLoading={isLoading}
      navigationTitle={cacheNotice ? "Current Time of Day (cached)" : currentLabel}
      searchBarPlaceholder="Search current time habits"
    >
      {!hasAnyHabits ? (
        emptyView
      ) : (
        <>
          {habits.length > 0 && (
            <List.Section
              title={currentLabel}
              subtitle={currentPeriod ? formatTimeOfDayRange(currentPeriod) : undefined}
            >
              {habits.map((habit) => (
                <HabitListItem
                  key={habit.id}
                  habit={habit}
                  apiKey={apiKey}
                  rowColorMode={rowColorMode}
                  onMutate={mutateHabit}
                  onRefresh={refresh}
                />
              ))}
            </List.Section>
          )}
          {weekly.length > 0 && (
            <List.Section title="This Week">
              {weekly.map((habit) => (
                <HabitListItem
                  key={habit.id}
                  habit={habit}
                  apiKey={apiKey}
                  rowColorMode={rowColorMode}
                  onMutate={mutateHabit}
                  onRefresh={refresh}
                />
              ))}
            </List.Section>
          )}
          {monthly.length > 0 && (
            <List.Section title="This Month">
              {monthly.map((habit) => (
                <HabitListItem
                  key={habit.id}
                  habit={habit}
                  apiKey={apiKey}
                  rowColorMode={rowColorMode}
                  onMutate={mutateHabit}
                  onRefresh={refresh}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
