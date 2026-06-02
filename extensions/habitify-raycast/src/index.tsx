import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useMemo, useState } from "react";
import HabitDetail from "./components/HabitDetail";
import LogAmountForm from "./components/LogAmountForm";
import {
  groupTodayHabits,
  habitProgressLabel,
  habitStatusLabel,
  resolveRowTint,
  sortTimeOfDays,
  splitHabitsByPeriodicity,
  statusIcon,
  statusTintColor,
  streakIcon,
  TodayHabit,
} from "./lib/habitify";
import { useTodayHabits } from "./hooks/useTodayHabits";

export default function Command() {
  const { apiKey, rowColorMode } = getPreferenceValues<Preferences>();
  const { habits, isLoading, error, cacheNotice, mutateHabit, refresh } = useTodayHabits(apiKey);
  const [filter, setFilter] = useState<string>("tod:due-now");

  const timeOfDays = useMemo(() => {
    const pairs = habits.flatMap((habit) => habit.timeOfDays.map((period) => [period.id, period] as const));
    return sortTimeOfDays(Array.from(new Map(pairs).values()));
  }, [habits]);

  const areas = useMemo(() => {
    const pairs = habits.flatMap((habit) => habit.areas.map((area) => [area.id, area] as const));
    return Array.from(new Map(pairs).values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [habits]);

  const filteredHabits = useMemo(() => {
    const isAreaFilter = filter.startsWith("area:");
    const activeAreaId = isAreaFilter ? filter.slice(5) : null;
    const timeKey = isAreaFilter ? "all" : filter.slice(4);

    let next = habits;
    if (timeKey === "due-now") next = next.filter((h) => h.currentTimeOfDay !== null);
    else if (timeKey === "anytime") next = next.filter((h) => h.timeOfDays.length === 0);
    else if (timeKey !== "all") next = next.filter((h) => h.timeOfDays.some((p) => p.id === timeKey));
    if (activeAreaId) next = next.filter((h) => h.areas.some((a) => a.id === activeAreaId));

    return next;
  }, [filter, habits]);

  const { daily, weekly, monthly } = useMemo(() => splitHabitsByPeriodicity(filteredHabits), [filteredHabits]);
  const dailyGroups = useMemo(() => groupTodayHabits(daily), [daily]);

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
        icon={Icon.House}
        title="No habits found"
        description="Habitify did not return any habits for today."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={refresh} />
          </ActionPanel>
        }
      />
    );
  }, [error, refresh]);

  const filteredEmptyView = useMemo(() => {
    if (habits.length === 0) {
      return emptyView;
    }

    return (
      <List.EmptyView
        icon={Icon.Filter}
        title="No habits match filters"
        description="Try switching to All Habits or selecting a different filter."
        actions={
          <ActionPanel>
            <Action title="Show All Habits" onAction={() => setFilter("tod:all")} />
            <Action title="Refresh" onAction={refresh} />
          </ActionPanel>
        }
      />
    );
  }, [emptyView, habits.length, refresh]);

  function renderHabitItem(habit: TodayHabit) {
    const detail = habitProgressLabel(habit);
    const accessories: List.Item.Accessory[] = [
      { text: habitStatusLabel(habit.status), icon: { source: statusIcon(habit.status), tintColor: statusTintColor(habit.status) } },
    ];
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

  const hasAnyHabits = daily.length > 0 || weekly.length > 0 || monthly.length > 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={cacheNotice ? "Today Habits (cached)" : "Today Habits"}
      searchBarPlaceholder="Search habits"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter habits" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="Due Now" value="tod:due-now" />
          <List.Dropdown.Item title="All Habits" value="tod:all" />
          <List.Dropdown.Section title="Time of Day">
            {timeOfDays.map((period) => (
              <List.Dropdown.Item key={period.id} title={period.name} value={`tod:${period.id}`} />
            ))}
            <List.Dropdown.Item title="Any time" value="tod:anytime" />
          </List.Dropdown.Section>
          {areas.length > 0 && (
            <List.Dropdown.Section title="Area">
              {areas.map((area) => (
                <List.Dropdown.Item key={area.id} title={area.name} value={`area:${area.id}`} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {!hasAnyHabits ? (
        filteredEmptyView
      ) : (
        <>
          {dailyGroups.map((group) => (
            <List.Section key={group.id} title={group.title} subtitle={group.subtitle}>
              {group.entries.map((habit) => renderHabitItem(habit))}
            </List.Section>
          ))}
          {weekly.length > 0 && (
            <List.Section title="This Week">
              {weekly.map((habit) => renderHabitItem(habit))}
            </List.Section>
          )}
          {monthly.length > 0 && (
            <List.Section title="This Month">
              {monthly.map((habit) => renderHabitItem(habit))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
