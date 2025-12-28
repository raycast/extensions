import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect } from "react";
import { useHabits } from "./hooks/useHabits";
import { HabitService } from "./api/habitService";
import { getToday_YYYYMMDD } from "./utils/date";
import { getProgressBar } from "./utils/progress";
import { CreateHabitForm } from "./components/CreateHabitForm";
import { EditHabitForm } from "./components/EditHabitForm";
import { HabitDetails } from "./components/HabitDetails";
import { HabitCalendar } from "./components/HabitCalendar";

export default function Command() {
  const { habits, isLoading, revalidate } = useHabits();
  const today = getToday_YYYYMMDD();
  const activeHabits = habits.filter((h) => !h.is_paused);

  useEffect(() => {
    async function updateMetadata() {
      const pendingCount = activeHabits.filter((h) => !h.todayLog).length;
      await updateCommandMetadata({
        subtitle: `${pendingCount} habit${
          pendingCount === 1 ? "" : "s"
        } pending`,
      });
    }
    updateMetadata();
  }, [habits, activeHabits]);

  // Optimistic UI updates
  // For now, we rely on revalidate() which re-fetches from storage.
  // Since storage is local, it should be fast.

  async function handleToggle(habitId: string, isCompleted: boolean) {
    try {
      if (isCompleted) {
        await HabitService.undoLog(habitId, today);
        showToast(Toast.Style.Success, "Undo log");
      } else {
        await HabitService.logHabit(habitId, "completed", today);
        showToast(Toast.Style.Success, "Habit completed!");
      }
      revalidate();
    } catch (e) {
      showToast(Toast.Style.Failure, "Failed to update habit");
    }
  }

  async function handleSkip(habitId: string) {
    try {
      await HabitService.logHabit(habitId, "skipped", today);
      showToast(Toast.Style.Success, "Habit skipped");
      revalidate();
    } catch (e) {
      showToast(Toast.Style.Failure, "Failed to skip habit");
    }
  }

  async function handleDelete(habitId: string) {
    if (
      await confirmAlert({
        title: "Delete Habit?",
        message: "This cannot be undone.",
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: "Delete",
        },
      })
    ) {
      await HabitService.deleteHabit(habitId);
      showToast(Toast.Style.Success, "Habit deleted");
      revalidate();
    }
  }

  async function handleTogglePause(habitId: string) {
    await HabitService.togglePause(habitId);
    revalidate();
  }

  // Filter habits?
  // Active vs Paused?
  // Show active first.

  const pausedHabits = habits.filter((h) => h.is_paused);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search habits...">
      <List.Section title="Active Habits">
        {activeHabits.map((habit) => {
          // Using todayLog from hook
          const isCompleted = habit.todayLog?.status === "completed";
          const isSkipped = habit.todayLog?.status === "skipped";

          let icon = { source: Icon.Circle, tintColor: Color.PrimaryText };
          if (isCompleted)
            icon = { source: Icon.CheckCircle, tintColor: Color.Green };
          if (isSkipped)
            icon = { source: Icon.MinusCircle, tintColor: Color.SecondaryText };

          return (
            <List.Item
              key={habit.id}
              title={habit.name}
              subtitle={`Month ${getProgressBar(
                habit.stats.completion_rate_30d
              )} ${habit.stats.completion_rate_30d}%`}
              icon={icon}
              accessories={[
                { text: `Streak: ${habit.stats.current}` },
                { text: isCompleted ? "Done" : isSkipped ? "Skipped" : "" },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Daily Actions">
                    {!isSkipped && (
                      <Action
                        title={isCompleted ? "Undo" : "Complete"}
                        icon={isCompleted ? Icon.Undo : Icon.Check}
                        onAction={() => handleToggle(habit.id, isCompleted)}
                      />
                    )}
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<HabitDetails habit={habit} />}
                    />
                    <Action.Push
                      title="View Calendar"
                      icon={Icon.Calendar}
                      target={<HabitCalendar habit={habit} />}
                    />
                    {!isCompleted && !isSkipped && (
                      <Action
                        title="Skip"
                        icon={Icon.Forward}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                        onAction={() => handleSkip(habit.id)}
                      />
                    )}
                    {isSkipped && (
                      <Action
                        title="Undo Skip"
                        icon={Icon.Undo}
                        onAction={() => handleToggle(habit.id, true)}
                      /> // Reuse undo logic? undoLog removes checking date.
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Management">
                    <Action.Push
                      title="Add Habit"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<CreateHabitForm onRevalidate={revalidate} />}
                    />
                    <Action.Push
                      title="Edit Habit"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      target={
                        <EditHabitForm
                          habit={habit}
                          onRevalidate={revalidate}
                        />
                      }
                    />
                    <Action
                      title={habit.is_paused ? "Resume" : "Pause"}
                      icon={habit.is_paused ? Icon.Play : Icon.Pause}
                      onAction={() => handleTogglePause(habit.id)}
                    />
                    <Action
                      title="Delete"
                      style={Action.Style.Destructive}
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(habit.id)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {pausedHabits.length > 0 && (
        <List.Section title="Paused">
          {pausedHabits.map((habit) => (
            <List.Item
              key={habit.id}
              title={habit.name}
              icon={{ source: Icon.Pause, tintColor: Color.SecondaryText }}
              actions={
                <ActionPanel>
                  <Action
                    title="Resume"
                    icon={Icon.Play}
                    onAction={() => handleTogglePause(habit.id)}
                  />
                  <Action
                    title="Delete"
                    style={Action.Style.Destructive}
                    icon={Icon.Trash}
                    onAction={() => handleDelete(habit.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="">
        <List.Item
          title=""
          subtitle="Press Cmd+N to create a habit"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Habit"
                icon={Icon.Plus}
                target={<CreateHabitForm onRevalidate={revalidate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
