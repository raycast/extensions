import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import NodeFetch from "node-fetch";

import CreateHabitForm from "./components/create-habit-form";
import { Habit } from "./models/habit";

export default function Command() {
  const { secret } = getPreferenceValues<Preferences>();

  const {
    isLoading,
    data: habits,
    revalidate,
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
      await NodeFetch(`https://www.supahabits.com/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ secret }),
      });
      showToast({ style: Toast.Style.Success, title: "Habit marked as completed" });
      revalidate();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to mark habit as completed" });
    }
  };

  return (
    <List isLoading={isLoading}>
      {habits && habits.length > 0 ? (
        habits.map((habit) => (
          <List.Item
            key={habit.id}
            icon={habit.completed === true ? Icon.CheckCircle : Icon.Circle}
            title={habit.name}
            actions={
              habit.completed === false ? (
                <ActionPanel>
                  <Action title="Mark as Completed" onAction={() => markHabitAsCompleted(habit.id)} />
                  <Action.OpenInBrowser
                    title="View Habits Details Online"
                    url="https://www.supahabits.com/dashboard"
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                </ActionPanel>
              ) : (
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="View Habits Details Online"
                    url="https://www.supahabits.com/dashboard"
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                </ActionPanel>
              )
            }
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
            <Action.Push title="Create Habit" target={<CreateHabitForm revalidate={revalidate} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
