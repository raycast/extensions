import { List, ActionPanel, Action, Icon, Color, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getTodaysTasks,
  getInProgressTasks,
  getBlockedTasks,
  getOverdueTasks,
  getCompletedTodayTasks,
  updateTask,
} from "./notionClient";
import { NotionTask, PRIORITY_ICONS } from "./types";
import { format, parseISO } from "date-fns";

interface DailyOverviewData {
  todaysFocus: NotionTask[];
  inProgress: NotionTask[];
  blocked: NotionTask[];
  overdue: NotionTask[];
  completedToday: NotionTask[];
}

export default function DailyOverview() {
  const [data, setData] = useState<DailyOverviewData>({
    todaysFocus: [],
    inProgress: [],
    blocked: [],
    overdue: [],
    completedToday: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [todaysFocus, inProgress, blocked, overdue, completedToday] = await Promise.all([
        getTodaysTasks(),
        getInProgressTasks(),
        getBlockedTasks(),
        getOverdueTasks(),
        getCompletedTodayTasks(),
      ]);

      setData({
        todaysFocus,
        inProgress: inProgress.slice(0, 3), // Limit to 3 most recent
        blocked,
        overdue,
        completedToday,
      });
    } catch (error) {
      console.error("Error loading daily overview:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load overview",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        primaryAction:
          error instanceof Error && error.message.includes("Unauthorized")
            ? {
                title: "Open Settings",
                onAction: async () => {
                  await openExtensionPreferences();
                },
              }
            : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAsDone(task: NotionTask) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating task..." });
    try {
      await updateTask(task.id, { status: "Done", progress: "100%" });
      toast.style = Toast.Style.Success;
      toast.title = `✓ ${task.Name} → Done`;
      await loadData();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update task";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  function getAccessories(task: NotionTask) {
    const accessories: List.Item.Accessory[] = [];

    if (task.Priority) {
      accessories.push({
        text: `${PRIORITY_ICONS[task.Priority]} ${task.Priority}`,
        tooltip: `Priority: ${task.Priority}`,
      });
    }

    if (task.Progress && task.Status !== "Done") {
      accessories.push({
        text: task.Progress,
        tooltip: `Progress: ${task.Progress}`,
      });
    }

    if (task["Estimated Time"]) {
      accessories.push({
        text: `⏱ ${task["Estimated Time"]}`,
        tooltip: `Estimated: ${task["Estimated Time"]}`,
      });
    }

    if (task["Energy Level"]) {
      accessories.push({
        text: `🔋 ${task["Energy Level"]}`,
        tooltip: `Energy: ${task["Energy Level"]}`,
      });
    }

    return accessories;
  }

  const totalTasks = data.todaysFocus.length + data.overdue.length;
  const completedCount = data.completedToday.length;

  return (
    <List isLoading={isLoading}>
      <List.Section
        title="📊 Daily Summary"
        subtitle={`${completedCount}/${totalTasks + completedCount} tasks completed`}
      >
        <List.Item
          title={`Today's Focus: ${data.todaysFocus.length} tasks`}
          icon={{ source: Icon.Target, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadData} />
            </ActionPanel>
          }
        />
        <List.Item
          title={`In Progress: ${data.inProgress.length} tasks`}
          icon={{ source: Icon.Circle, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadData} />
            </ActionPanel>
          }
        />
        {data.blocked.length > 0 && (
          <List.Item
            title={`Blocked: ${data.blocked.length} tasks`}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadData} />
              </ActionPanel>
            }
          />
        )}
        {data.overdue.length > 0 && (
          <List.Item
            title={`⚠️ Overdue: ${data.overdue.length} tasks`}
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadData} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {data.todaysFocus.length > 0 && (
        <List.Section title="🎯 Today's Focus" subtitle="Due or planned for today">
          {data.todaysFocus.map((task) => (
            <List.Item
              key={task.id}
              title={task.Name}
              subtitle={task.Project || undefined}
              icon={{ source: Icon.Circle, tintColor: getStatusColor(task.Status) }}
              accessories={getAccessories(task)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Notion" url={task.url} />
                  <Action
                    title="Mark as Done"
                    icon={Icon.Check}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleMarkAsDone(task)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadData}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {data.inProgress.length > 0 && (
        <List.Section title="⏳ In Progress" subtitle="Currently active tasks">
          {data.inProgress.map((task) => (
            <List.Item
              key={task.id}
              title={task.Name}
              subtitle={task.Project || undefined}
              icon={{ source: Icon.Circle, tintColor: Color.Blue }}
              accessories={getAccessories(task)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Notion" url={task.url} />
                  <Action
                    title="Mark as Done"
                    icon={Icon.Check}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleMarkAsDone(task)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadData}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {data.blocked.length > 0 && (
        <List.Section title="🚫 Blocked" subtitle="Tasks waiting on dependencies">
          {data.blocked.map((task) => (
            <List.Item
              key={task.id}
              title={task.Name}
              subtitle={task.Project || undefined}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              accessories={getAccessories(task)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Notion" url={task.url} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadData}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {data.overdue.length > 0 && (
        <List.Section title="⚠️ Overdue" subtitle="Past due date">
          {data.overdue.map((task) => (
            <List.Item
              key={task.id}
              title={task.Name}
              subtitle={
                task["Due Date"]
                  ? `Due: ${format(parseISO(task["Due Date"]), "MMM dd, yyyy")}`
                  : task.Project || undefined
              }
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
              accessories={getAccessories(task)}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Notion" url={task.url} />
                  <Action
                    title="Mark as Done"
                    icon={Icon.Check}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleMarkAsDone(task)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadData}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {data.completedToday.length > 0 && (
        <List.Section title="✅ Completed Today" subtitle="Great job!">
          {data.completedToday.map((task) => (
            <List.Item
              key={task.id}
              title={task.Name}
              subtitle={task.Project || undefined}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[
                {
                  text: "✓ Done",
                  tooltip: "Completed",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Notion" url={task.url} />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadData}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!isLoading &&
        data.todaysFocus.length === 0 &&
        data.inProgress.length === 0 &&
        data.blocked.length === 0 &&
        data.overdue.length === 0 &&
        data.completedToday.length === 0 && (
          <List.EmptyView
            title="No tasks for today"
            description="Create a new task to get started!"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          />
        )}
    </List>
  );
}

function getStatusColor(status: string): Color {
  switch (status) {
    case "Done":
      return Color.Green;
    case "In progress":
      return Color.Blue;
    case "Blocked":
      return Color.Red;
    case "To-do":
      return Color.Yellow;
    case "Backlog":
      return Color.SecondaryText;
    default:
      return Color.PrimaryText;
  }
}
