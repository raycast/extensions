import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  Icon,
  confirmAlert,
  openExtensionPreferences,
  showHUD,
  Color,
} from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";
import { showFailureToast, useFetch } from "@raycast/utils";

import { Goal } from "./models/goal";
import { getTimeRemaining } from "./utils/dates";
import GoalForm from "./components/goal-form";
import GoalDetailView from "./components/goal-detail-view";

export default function GoalsCommand() {
  const [searchText, setSearchText] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { secret } = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const {
    isLoading,
    data: goals,
    revalidate,
  } = useFetch(`https://www.supahabits.com/api/goals?secret=${secret}`, {
    parseResponse: async (response) => {
      return (await response.json()) as Goal[];
    },
    onError: async (error) => {
      if (error.message.indexOf("Unauthorized") !== -1) {
        await showHUD("⛔ Unauthorized, Please set your secret in the extension preferences");
        await openExtensionPreferences();
        return;
      }
      await showFailureToast(error, { title: "🚫 Failed to fetch goals" });
    },
  });

  const filteredGoals = goals?.filter((goal) => {
    // Apply status filter if not "all"
    if (statusFilter !== "all" && goal.status !== statusFilter) {
      return false;
    }

    // Apply text search if present
    if (searchText && !goal.title.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }

    return true;
  });

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!goals || goals.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No goals found"
          description="You don't have any goals yet. Create one to get started."
          actions={
            <ActionPanel>
              <Action title="Create Goal" onAction={() => push(<GoalForm mode="create" onSuccess={revalidate} />)} />
              <Action.OpenInBrowser
                title="Open Supahabits Dashboard"
                url="https://www.supahabits.com/dashboard/goals"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search goals..."
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by status" value={statusFilter} onChange={setStatusFilter}>
          <List.Dropdown.Item title="All Goals" value="all" />
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Completed" value="completed" />
          <List.Dropdown.Item title="Upcoming" value="upcoming" />
        </List.Dropdown>
      }
    >
      {filteredGoals?.map((goal) => (
        <List.Item
          key={goal.id}
          title={goal.title}
          accessories={[
            {
              tag: {
                value: getStatusLabel(goal.status),
                color: getStatusColor(goal.status),
              },
            },
            {
              text: getTimeRemaining(goal.due_date),
              tooltip: "Time remaining",
            },
          ]}
          detail={<GoalDetailView goal={goal} />}
          actions={
            <ActionPanel>
              {goal.status !== "completed" && (
                <Action
                  title="Complete Goal"
                  icon={Icon.Checkmark}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Complete Goal",
                        message: "Are you sure you want to mark this goal as complete?",
                      })
                    ) {
                      await completeGoal(goal.id, secret);
                      revalidate();
                    }
                  }}
                />
              )}
              <Action
                title="Edit Goal"
                icon={Icon.Pencil}
                onAction={() => push(<GoalForm goal={goal} mode="edit" onSuccess={revalidate} />)}
              />
              <Action
                title="Delete Goal"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Delete Goal",
                      message: "Are you sure you want to delete this goal? This action cannot be undone.",
                      icon: Icon.Trash,
                    })
                  ) {
                    await deleteGoal(goal.id, secret);
                    revalidate();
                  }
                }}
              />
              <ActionPanel.Section title="Navigation">
                <Action
                  title="Create Goal"
                  icon={Icon.Plus}
                  onAction={() => push(<GoalForm mode="create" onSuccess={revalidate} />)}
                />
                <Action.OpenInBrowser
                  title="Open Supahabits Dashboard"
                  url="https://www.supahabits.com/dashboard/goals"
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "upcoming":
      return "Upcoming";
    default:
      return status;
  }
}

function getStatusColor(status: string): Color {
  switch (status) {
    case "active":
      return Color.Green;
    case "completed":
      return Color.Blue;
    case "upcoming":
      return Color.Orange;
    default:
      return Color.PrimaryText;
  }
}

async function completeGoal(goalId: string, secret: string) {
  try {
    const response = await fetch("https://www.supahabits.com/api/goals/complete", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        goal_id: goalId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    await showToast({ style: Toast.Style.Success, title: "Goal completed successfully" });
    return true;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to complete goal" });
    return false;
  }
}

async function deleteGoal(goalId: string, secret: string) {
  try {
    const response = await fetch(`https://www.supahabits.com/api/goals/${goalId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    await showToast({ style: Toast.Style.Success, title: "Goal deleted successfully" });
    return true;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to delete goal" });
    return false;
  }
}
