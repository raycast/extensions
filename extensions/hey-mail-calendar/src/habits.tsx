import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { AuthGuard } from "./lib/auth-guard";
import { habitIcon, heyColorIcon } from "./lib/colors";
import { runHey } from "./lib/hey";
import type { HeyCalendar, HeyRecordingsData, Preferences } from "./lib/types";

export default function HabitsCommand() {
  return (
    <AuthGuard>
      <HabitsList />
    </AuthGuard>
  );
}

function HabitsList() {
  const preferences = getPreferenceValues<Preferences>();
  const today = new Date().toISOString().slice(0, 10);

  const { isLoading, data, error, revalidate } = usePromise(async () => {
    const calendarId = await resolveHabitsCalendarId(preferences.habitsCalendarId);
    const response = await runHey<HeyRecordingsData>([
      "recordings",
      String(calendarId),
      "--starts-on",
      today,
      "--ends-on",
      today,
      "--json",
    ]);
    const habits = response.data["Calendar::Habit"] ?? [];
    const completions = response.data["Calendar::Habit::Completion"] ?? [];
    const completedParentIds = new Set(
      completions.map((completion) => completion.parent_id).filter((id): id is number => id !== undefined),
    );

    return habits.map((habit) => ({
      ...habit,
      completedToday: completedParentIds.has(habit.id),
    }));
  });

  const scheduledToday = useMemo(() => {
    const weekday = new Date().getDay();
    return (data ?? []).filter((habit) => !habit.days?.length || habit.days.includes(weekday));
  }, [data]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search habits…" navigationTitle="Today's Habits">
      {error ? (
        <List.EmptyView
          title="Could Not Load Habits"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {scheduledToday.length === 0 && !isLoading ? (
        <List.EmptyView title="No Habits Today" description="No habits scheduled for today." />
      ) : null}
      {scheduledToday.map((habit) => (
        <List.Item
          key={habit.id}
          title={habit.title}
          icon={habit.icon_url ? habitIcon(habit.icon_url) : heyColorIcon(habit.color)}
          accessories={[
            {
              icon: habit.completedToday ? Icon.CheckCircle : Icon.Circle,
              tooltip: habit.completedToday ? "Completed today" : "Not completed",
            },
            habit.color ? { text: habit.color, icon: heyColorIcon(habit.color) } : { text: "Habit" },
          ]}
          actions={
            <ActionPanel>
              {habit.completedToday ? (
                <Action
                  title="Mark Incomplete"
                  icon={Icon.Circle}
                  onAction={() => toggleHabit(habit.id, "uncomplete", revalidate)}
                />
              ) : (
                <Action
                  title="Mark Complete"
                  icon={Icon.CheckCircle}
                  onAction={() => toggleHabit(habit.id, "complete", revalidate)}
                />
              )}
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function resolveHabitsCalendarId(configuredId?: string): Promise<number> {
  if (configuredId?.trim()) {
    return Number(configuredId.trim());
  }

  const response = await runHey<HeyCalendar[]>(["calendars", "--json"]);
  const personal = response.data.find((calendar) => calendar.personal);
  if (personal) {
    return personal.id;
  }

  const first = response.data[0];
  if (!first) {
    throw new Error("No calendars found.");
  }
  return first.id;
}

async function toggleHabit(id: number, action: "complete" | "uncomplete", revalidate: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: action === "complete" ? "Completing habit…" : "Uncompleting habit…",
  });
  try {
    await runHey(["habit", action, String(id)]);
    toast.style = Toast.Style.Success;
    toast.title = action === "complete" ? "Habit completed" : "Habit uncompleted";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Update failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
