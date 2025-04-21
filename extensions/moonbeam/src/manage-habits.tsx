import {
  Action,
  ActionPanel,
  List,
  showToast,
  Toast,
  Form,
  getPreferenceValues,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState, useEffect } from "react";
import { Icon } from "@raycast/api";

interface Preferences {
  apiToken: string;
}

interface Habit {
  id: string;
  name: string;
}

interface FormValues {
  name: string;
  id: string;
}

export default function Command() {
  const { apiToken } = getPreferenceValues<Preferences>();
  const { value: habits, setValue: setHabits } = useLocalStorage<Habit[]>(
    "habits",
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!apiToken) {
      showToast({
        style: Toast.Style.Failure,
        title: "API Token Required",
        message:
          "Please set your Lunatask API token in the extension preferences",
      });
    }
    setIsLoading(false);
  }, [apiToken]);

  const handleCompleteHabit = async (habitId: string) => {
    if (!apiToken) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Token Required",
        message:
          "Please set your Lunatask API token in the extension preferences",
      });
      return;
    }

    try {
      const response = await fetch(
        `https://api.lunatask.app/v1/habits/${habitId}/track`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({
            performed_on: new Date().toISOString().split("T")[0],
          }),
        },
      );

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Invalid API token. Please check your token in the extension preferences.",
          );
        }
        throw new Error(
          `Failed to complete habit: ${JSON.stringify(responseData)}`,
        );
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Habit completed successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete habit",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleAddHabit = async (values: FormValues) => {
    if (!apiToken) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Token Required",
        message:
          "Please set your Lunatask API token in the extension preferences",
      });
      return;
    }

    if (!values.name || !values.id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Information",
        message: "Please provide both habit name and ID",
      });
      return;
    }

    try {
      const newHabits = [
        ...(habits || []),
        { id: values.id, name: values.name },
      ];
      await setHabits(newHabits);
      await showToast({
        style: Toast.Style.Success,
        title: "Habit added successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add habit",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleRemoveHabit = async (habitId: string) => {
    if (!apiToken) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API Token Required",
        message:
          "Please set your Lunatask API token in the extension preferences",
      });
      return;
    }

    try {
      const newHabits = (habits || []).filter((h) => h.id !== habitId);
      await setHabits(newHabits);
      await showToast({
        style: Toast.Style.Success,
        title: "Habit removed successfully",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove habit",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!habits || habits.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No habits configured"
          description="Press ⌘K to add a new habit"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Habit"
                target={
                  <Form
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm
                          title="Add Habit"
                          onSubmit={handleAddHabit}
                        />
                      </ActionPanel>
                    }
                  >
                    <Form.TextField
                      id="name"
                      title="Habit Name"
                      placeholder="Enter habit name"
                    />
                    <Form.TextField
                      id="id"
                      title="Habit ID"
                      placeholder="Enter habit ID from Lunatask"
                    />
                  </Form>
                }
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Habit"
            icon={Icon.Plus}
            target={
              <Form
                actions={
                  <ActionPanel>
                    <Action.SubmitForm
                      title="Add Habit"
                      onSubmit={handleAddHabit}
                    />
                  </ActionPanel>
                }
              >
                <Form.TextField
                  id="name"
                  title="Habit Name"
                  placeholder="Enter habit name"
                />
                <Form.TextField
                  id="id"
                  title="Habit ID"
                  placeholder="Enter habit ID from Lunatask"
                />
              </Form>
            }
          />
        </ActionPanel>
      }
    >
      {habits.map((habit, index) => (
        <List.Item
          key={habit.id}
          title={habit.name}
          subtitle={`Press ${index + 1} to complete`}
          actions={
            <ActionPanel>
              <Action
                title="Complete Habit"
                icon={Icon.Checkmark}
                onAction={() => handleCompleteHabit(habit.id)}
              />
              <Action
                title="Remove Habit"
                icon={Icon.Trash}
                onAction={() => handleRemoveHabit(habit.id)}
                style={Action.Style.Destructive}
              />
              <Action.Push
                title="Add Habit"
                icon={Icon.Plus}
                target={
                  <Form
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm
                          title="Add Habit"
                          onSubmit={handleAddHabit}
                        />
                      </ActionPanel>
                    }
                  >
                    <Form.TextField
                      id="name"
                      title="Habit Name"
                      placeholder="Enter habit name"
                    />
                    <Form.TextField
                      id="id"
                      title="Habit ID"
                      placeholder="Enter habit ID from Lunatask"
                    />
                  </Form>
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
