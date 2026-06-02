import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useMemo } from "react";
import HabitDetail from "./components/HabitDetail";
import LogAmountForm from "./components/LogAmountForm";
import {
  formatTimeOfDayRange,
  habitProgressLabel,
  habitStatusLabel,
  resolveRowTint,
  splitHabitsByPeriodicity,
  statusIcon,
  statusTintColor,
  streakIcon,
} from "./lib/habitify";
import { useTodayHabits } from "./hooks/useTodayHabits";

export default function Command() {
  const { apiKey, rowColorMode } = getPreferenceValues<Preferences>();
  const { habits: allHabits, isLoading, error, cacheNotice, mutateHabit, refresh } = useTodayHabits(apiKey);

  const { daily, weekly, monthly } = useMemo(() => splitHabitsByPeriodicity(allHabits), [allHabits]);
  const habits = useMemo(() => daily.filter((h) => h.currentTimeOfDay !== null), [daily]);

  const hasAnyHabits = habits.length > 0 || weekly.length > 0 || monthly.length > 0;

  const emptyView = useMemo(() => {
    if (error) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load Habitify"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              <Action title="Retry" onAction={refresh} />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.Clock}
        title="No habits due right now"
        description="Habitify does not have any habits scheduled for the current time of day."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={refresh} />
          </ActionPanel>
        }
      />
    );
  }, [error, refresh]);

  const currentPeriod = habits[0]?.currentTimeOfDay ?? null;
  const currentLabel = currentPeriod?.name ?? "Current Time of Day";

  function renderHabitItem(habit: (typeof habits)[number]) {
    const detail = habitProgressLabel(habit);
    const accessories = [{ text: habitStatusLabel(habit.status), icon: { source: statusIcon(habit.status), tintColor: statusTintColor(habit.status) } }];
    const rowTint = resolveRowTint(habit, rowColorMode);

    if (habit.currentStreak) {
      accessories.push({ text: `${habit.currentStreak.length}d`, icon: streakIcon() });
    }

    return (
      <List.Item
        key={habit.id}
        title={habit.name}
        subtitle={detail}
        icon={rowTint ? { source: statusIcon(habit.status), tintColor: rowTint } : statusIcon(habit.status)}
        accessories={accessories}
        actions={
          <ActionPanel title={habit.name}>
            {habit.status === "completed" ? (
              <Action
                title="Undo Today"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => void mutateHabit(habit.id, habit.name, "undo")}
              />
            ) : (
              <Action
                title="Mark Completed"
                icon={{ source: Icon.CheckCircle, tintColor: "#20B26B" }}
                onAction={() => void mutateHabit(habit.id, habit.name, "complete")}
              />
            )}
            {habit.progress && (
              <Action.Push
                title="Log Amount"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
                target={<LogAmountForm habit={habit} apiKey={apiKey} onSuccess={refresh} />}
              />
            )}
            {habit.status === "inprogress" && (
              <Action
                title="Skip"
                icon={Icon.ArrowRight}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => void mutateHabit(habit.id, habit.name, "skip")}
              />
            )}
            {habit.progress && habit.progress.current > 0 && (
              <Action
                title="Remove Last Log"
                icon={Icon.Minus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                onAction={() => void mutateHabit(habit.id, habit.name, "decrement")}
              />
            )}
            <Action.Push
              title="View Statistics"
              icon={Icon.BarChart}
              target={
                <HabitDetail
                  apiKey={apiKey}
                  habitId={habit.id}
                  habitName={habit.name}
                  onRefresh={refresh}
                />
              }
            />
            <Action
              title="Refresh"
              icon={Icon.RotateClockwise}
              onAction={refresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action.CopyToClipboard title="Copy Habit ID" content={habit.id} />
          </ActionPanel>
        }
      />
    );
  }

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
              {habits.map(renderHabitItem)}
            </List.Section>
          )}
          {weekly.length > 0 && (
            <List.Section title="This Week">
              {weekly.map(renderHabitItem)}
            </List.Section>
          )}
          {monthly.length > 0 && (
            <List.Section title="This Month">
              {monthly.map(renderHabitItem)}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
