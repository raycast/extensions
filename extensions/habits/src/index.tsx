import { useEffect, useState } from "react";
import { ActionPanel, List, Action, Cache, Icon, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";

import CreateHabitForm from "./components/create-habit-form";
import { Habit } from "./models/habit";
import SetSecret from "./components/set-secret";

const cache = new Cache();

export default function Command() {
  const cachedSecret = cache.get("secret");

  const [secret] = useState<string | undefined>(cachedSecret);
  const [habits, setHabits] = useState<Habit[] | undefined>();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (secret) {
      const fetchData = async () => {
        await retrieveHabits();
      };

      fetchData();
    }
  }, []);

  const retrieveHabits = async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://www.supahabits.com/api/habits?secret=${secret}`).then(res => res.json());
      setHabits(res as Habit[]);
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Failed to retrieve habits" });
    } finally {
      setLoading(false);
    }
  };

  const markHabitAsCompleted = async (habitId: number) => {
    const originalHabits = [...(habits ?? [])];
    const updatedHabits = habits?.map(habit =>
      habit.id === habitId ? { ...habit, completed: true } : habit
    );

    setHabits(updatedHabits);

    try {
      await fetch(`https://www.supahabits.com/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${secret}`
        },
        body: JSON.stringify({ secret })
      });
      showToast({ style: Toast.Style.Success, title: "✅ Habit marked as completed" });
    } catch (error) {
      const notUpdatedHabits = habits?.map(habit =>
        habit.id === habitId ? { ...habit, completed: false } : habit
      );
      setHabits(notUpdatedHabits);
      showToast({ style: Toast.Style.Failure, title: "🚫 Failed to mark habit as completed" });
      setHabits(originalHabits);
    }
  };

  if (!secret) {
    return <SetSecret />;
  }

  if (loading) {
    return <List isLoading={true} />;
  }

  return (
    <List>
      {habits && habits.length > 0 ? (
        habits.map((habit) => (
          <List.Item
            key={habit.id}
            icon={habit.completed === true ? Icon.CheckCircle : Icon.Circle}
            title={habit.name}
            actions={
              habit.completed === false ? (
                <ActionPanel>
                  <Action
                    title="Mark as Completed"
                    onAction={() => markHabitAsCompleted(habit.id)}
                  />
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
            <Action.Push
              title="Create Habit"
              target={<CreateHabitForm secret={secret} revalidate={retrieveHabits} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
