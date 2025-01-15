import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  Color,
  showHUD,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import NodeFetch from "node-fetch";

import { Habit } from "./models/habit";
import CreateHabitForm from "./components/create-habit-form";
import CreateRepeatableHabitForm from "./components/create-repeatable-habit";

export default function Command() {
  const { secret } = getPreferenceValues<Preferences>();

  const {
    isLoading,
    data: habits,
    revalidate,
    mutate,
  } = useFetch(`https://www.supahabits.com/api/habits?secret=${secret}`, {
    parseResponse: async (response) => {
      return (await response.json()) as Habit[];
    },
    onError: async (error) => {
      if (error.message.indexOf("Unauthorized") !== -1) {
        await showHUD("⛔ Unauthorized, Please set your secret in the extension preferences");
        await openExtensionPreferences();
      }
    },
  });

  const markHabitAsCompleted = async (habitId: number) => {
    try {
      await mutate(
        NodeFetch(`https://www.supahabits.com/api/habits/${habitId}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ secret }),
        }),
        {
          optimisticUpdate(data: Habit[] | undefined) {
            if (!data) {
              return [];
            }

            return data.map((habit) => (habit.id === habitId ? { ...habit, completed: true } : habit));
          },
        },
      );
      showToast({ style: Toast.Style.Success, title: "Habit marked as completed" });
      revalidate();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to mark habit as completed" });
    }
  };

  const getHabitIcon = (habit: Habit) => {
    if (habit.repeatable) {
      if (habit.completed === true) {
        return { source: Icon.Repeat, tintColor: Color.Green };
      }

      return { source: Icon.Repeat, tintColor: Color.Red };
    }

    return habit.completed
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.Circle, tintColor: Color.Red };
  };

  const getHabitActions = (habit: Habit, markHabitAsCompleted: (habitId: number) => void) => {
    if (habit.repeatable === true) {
      return (
        <ActionPanel>
          <Action title="Track Habit" icon={Icon.CheckCircle} onAction={() => markHabitAsCompleted(habit.id)} />
          <Action.OpenInBrowser
            title="View Habits Details Online"
            url="https://www.supahabits.com/dashboard"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
          <Action.OpenInBrowser
            title="View Habit Stats"
            url="https://www.supahabits.com/dashboard/stats"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      );
    }

    if (habit.completed === false) {
      return (
        <ActionPanel>
          <Action title="Mark as Done" icon={Icon.CheckCircle} onAction={() => markHabitAsCompleted(habit.id)} />
          <Action.OpenInBrowser
            title="View Habits Details Online"
            url="https://www.supahabits.com/dashboard"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
          <Action.OpenInBrowser
            title="View Habit Stats"
            url="https://www.supahabits.com/dashboard/stats"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      );
    }

    return (
      <ActionPanel>
        <Action.OpenInBrowser
          title="View Habits Details Online"
          url="https://www.supahabits.com/dashboard"
          shortcut={{ modifiers: ["cmd"], key: "h" }}
        />
        <Action.OpenInBrowser
          title="View Habit Stats"
          url="https://www.supahabits.com/dashboard/stats"
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      </ActionPanel>
    );
  };

  return (
    <List isLoading={isLoading}>
      {habits && habits.length > 0 ? (
        habits.map((habit) => (
          <List.Item
            key={habit.id}
            icon={getHabitIcon(habit)}
            title={habit.name}
            actions={getHabitActions(habit, markHabitAsCompleted)}
          />
        ))
      ) : (
        <List.EmptyView title="No habits found" />
      )}
      <List.Item
        icon={Icon.Plus}
        title="Create Habit"
        actions={
          <ActionPanel>
            <Action.Push title="Create Habit" icon={Icon.Wand} target={<CreateHabitForm revalidate={revalidate} />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Plus}
        title="Create Repeatable Habit"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Repeatable Habit"
              icon={Icon.Wand}
              target={<CreateRepeatableHabitForm revalidate={revalidate} />}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.RotateClockwise}
        title="Track past habits"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Track Past Habits"
              url="https://www.supahabits.com/dashboard/past-habits"
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
