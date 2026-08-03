import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color, Alert, confirmAlert } from "@raycast/api";
import { getTasks, startTask, archiveTask, deleteTask, updateTask } from "./api";
import type { Task } from "./types";

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  async function fetchTodayTasks() {
    setIsLoading(true);
    setHasError(false);
    try {
      const fetchedTasks = await getTasks({ tagId: "TODAY", source: "active" });
      setTasks(fetchedTasks);
    } catch (e) {
      console.error("Failed to fetch today's tasks:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  async function handleStartTask(taskId: string) {
    try {
      await startTask(taskId);
      fetchTodayTasks();
    } catch (e) {
      console.error("Failed to start task:", e);
    }
  }

  async function handleCompleteTask(task: Task) {
    try {
      await updateTask(task.id, { isDone: true });
      fetchTodayTasks();
    } catch (e) {
      console.error("Failed to complete task:", e);
    }
  }

  async function handleArchiveTask(task: Task) {
    if (
      await confirmAlert({
        title: "Archive Task",
        message: `Archive "${task.title}"?`,
        primaryAction: { title: "Archive" },
      })
    ) {
      try {
        await archiveTask(task.id);
        await showToast({ style: Toast.Style.Success, title: "Task archived" });
        fetchTodayTasks();
      } catch (e) {
        console.error("Failed to archive task:", e);
      }
    }
  }

  async function handleDeleteTask(task: Task) {
    if (
      await confirmAlert({
        title: "Delete Task",
        message: `Permanently delete "${task.title}"?`,
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteTask(task.id);
        await showToast({ style: Toast.Style.Success, title: "Task deleted" });
        fetchTodayTasks();
      } catch (e) {
        console.error("Failed to delete task:", e);
      }
    }
  }

  if (hasError) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load today's tasks"
          description="Make sure Super Productivity is running and its Local REST API is enabled."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search today's tasks...">
      {tasks.map((task) => {
        const timeEstimate = task.timeEstimate > 0 ? `${task.timeEstimate / 3600000}h` : "";
        const timeSpent = task.timeSpent > 0 ? `${(task.timeSpent / 3600000).toFixed(1)}h spent` : "";

        return (
          <List.Item
            key={task.id}
            title={task.title}
            keywords={[task.title]}
            accessories={[
              ...(timeSpent ? [{ text: timeSpent, icon: Icon.Clock }] : []),
              ...(timeEstimate ? [{ text: `est. ${timeEstimate}` }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={
                      task.timeSpent > 0
                        ? `Resume Tracking (${(task.timeSpent / 3600000).toFixed(1)}h spent)`
                        : "Start Tracking"
                    }
                    icon={task.timeSpent > 0 ? Icon.ArrowClockwise : Icon.Play}
                    onAction={() => handleStartTask(task.id)}
                  />
                  <Action
                    title="Mark Complete"
                    icon={Icon.CheckCircle}
                    onAction={() => handleCompleteTask(task)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Archive"
                    icon={Icon.Tray}
                    onAction={() => handleArchiveTask(task)}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteTask(task)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchTodayTasks}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && tasks.length === 0 && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No tasks for today"
          description='Schedule tasks for today in Super Productivity, or use "Create Task" to add one.'
        />
      )}
    </List>
  );
}
