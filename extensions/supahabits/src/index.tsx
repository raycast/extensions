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
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import NodeFetch from "node-fetch";

import { Habit } from "./models/habit";
import CreateHabitForm from "./components/create-habit-form";
import EditHabitForm from "./components/edit-habit-form";
import FeedbackForm from "./components/feedback-form";
import HabitStatsView from "./components/habit-stats-view";
import { getColorValue } from "./utils/colors";

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

  const removeLastTracking = async (habitId: number) => {
    try {
      await mutate(
        NodeFetch(`https://www.supahabits.com/api/habits/${habitId}/complete`, {
          method: "DELETE",
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

            return data.map((habit) => (habit.id === habitId ? { ...habit, completed: false } : habit));
          },
        },
      );
      showToast({ style: Toast.Style.Success, title: "Last tracking removed" });
      revalidate();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to remove last tracking" });
    }
  };

  const removeHabit = async (habitId: number, habitName: string) => {
    try {
      const confirmed = await confirmAlert({
        title: "Remove Habit",
        message: `Are you sure you want to remove "${habitName}"? This will delete the habit and all tracking history.`,
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) {
        return;
      }

      await mutate(
        NodeFetch(`https://www.supahabits.com/api/habits/${habitId}`, {
          method: "DELETE",
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

            return data.filter((habit) => habit.id !== habitId);
          },
        },
      );
      showToast({ style: Toast.Style.Success, title: "Habit removed successfully" });
      revalidate();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to remove habit" });
    }
  };

  const getHabitIcon = (habit: Habit) => {
    const habitColor: Color = habit.color ? getColorValue(habit.color) : Color.PrimaryText;

    if (habit.repeatable) {
      if (habit.completed === true) {
        return { source: Icon.Repeat, tintColor: habitColor };
      }

      return { source: Icon.Repeat, tintColor: Color.Red };
    }

    return habit.completed
      ? { source: Icon.CheckCircle, tintColor: habitColor }
      : { source: Icon.Circle, tintColor: Color.Red };
  };

  const getHabitActions = (
    habit: Habit,
    markHabitAsCompleted: (habitId: number) => void,
    removeLastTracking: (habitId: number) => void,
  ) => {
    const removeAction = (
      <Action
        title="Remove Habit"
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={() => removeHabit(habit.id, habit.name)}
      />
    );

    const editAction = (
      <Action.Push
        title="Edit Habit"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        target={<EditHabitForm habit={habit} revalidate={revalidate} />}
      />
    );

    if (habit.repeatable === true) {
      return (
        <ActionPanel>
          <Action title="Track Habit" icon={Icon.CheckCircle} onAction={() => markHabitAsCompleted(habit.id)} />
          {editAction}
          <Action.Push
            title="View Habit Stats"
            icon={Icon.BarChart}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<HabitStatsView habit={habit} />}
          />
          <Action.OpenInBrowser
            title="View Habits Details Online"
            url="https://www.supahabits.com/dashboard"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
          {removeAction}
        </ActionPanel>
      );
    }

    if (habit.completed === false) {
      return (
        <ActionPanel>
          <Action title="Mark as Done" icon={Icon.CheckCircle} onAction={() => markHabitAsCompleted(habit.id)} />
          {editAction}
          <Action.Push
            title="View Habit Stats"
            icon={Icon.BarChart}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<HabitStatsView habit={habit} />}
          />
          <Action.OpenInBrowser
            title="View Habits Details Online"
            url="https://www.supahabits.com/dashboard"
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
          {removeAction}
        </ActionPanel>
      );
    }

    return (
      <ActionPanel>
        <Action title="Unmark as Done" icon={Icon.Xmark} onAction={() => removeLastTracking(habit.id)} />
        {editAction}
        <Action.Push
          title="View Habit Stats"
          icon={Icon.BarChart}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          target={<HabitStatsView habit={habit} />}
        />
        <Action.OpenInBrowser
          title="View Habits Details Online"
          url="https://www.supahabits.com/dashboard"
          shortcut={{ modifiers: ["cmd"], key: "h" }}
        />
        {removeAction}
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
            actions={getHabitActions(habit, markHabitAsCompleted, removeLastTracking)}
            accessories={[{ text: habit.repeatable ? "Repeatable" : "" }]}
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
      <List.Item
        icon={Icon.Bubble}
        title="Send Feedback"
        actions={
          <ActionPanel>
            <Action.Push title="Send Feedback" icon={Icon.Envelope} target={<FeedbackForm />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
