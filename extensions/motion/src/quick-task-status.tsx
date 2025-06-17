import { ActionPanel, List, Action, Icon, showToast, Toast, Color, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { getTasks, updateTask, getWorkspaces, MotionTask, MotionWorkspace } from "./motion-api";

interface State {
  tasks: MotionTask[];
  workspaces: MotionWorkspace[];
  isLoading: boolean;
  error?: Error;
}

interface Preferences {
  defaultWorkspaceId?: string;
}

export default function Command() {
  const [state, setState] = useState<State>({
    tasks: [],
    workspaces: [],
    isLoading: true,
  });

  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchData() {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: undefined }));

        // Fetch workspaces first to get available statuses
        const workspaces = await getWorkspaces();

        // Fetch active tasks (not completed)
        const response = await getTasks({
          workspaceId: preferences.defaultWorkspaceId,
          includeAllStatuses: false, // Only get active tasks
        });

        setState((prev) => ({
          ...prev,
          tasks: response.tasks.filter((task) => !task.completed),
          workspaces,
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error("Unknown error"),
          isLoading: false,
        }));
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load tasks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    fetchData();
  }, []);

  const getStatusIcon = (status?: { name: string; isResolvedStatus: boolean }) => {
    if (!status) return { source: Icon.Circle, tintColor: Color.SecondaryText };

    const statusName = status.name.toLowerCase();

    if (status.isResolvedStatus) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }

    if (statusName.includes("progress") || statusName.includes("doing") || statusName.includes("active")) {
      return { source: Icon.Clock, tintColor: Color.Blue };
    }

    if (statusName.includes("todo") || statusName.includes("backlog") || statusName.includes("new")) {
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }

    if (statusName.includes("review") || statusName.includes("testing")) {
      return { source: Icon.Eye, tintColor: Color.Orange };
    }

    return { source: Icon.Dot, tintColor: Color.SecondaryText };
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "ASAP":
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      case "HIGH":
        return { source: Icon.ChevronUp, tintColor: Color.Orange };
      case "MEDIUM":
        return { source: Icon.Minus, tintColor: Color.Yellow };
      case "LOW":
        return { source: Icon.ChevronDown, tintColor: Color.Blue };
      default:
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 1) return `In ${diffDays} days`;

    return date.toLocaleDateString();
  };

  const getTaskSubtitle = (task: MotionTask) => {
    const parts = [];
    if (task.status?.name) parts.push(task.status.name);
    if (task.project?.Name) parts.push(task.project.Name);
    if (task.dueDate) parts.push(`Due: ${formatDate(task.dueDate)}`);
    return parts.join(" • ");
  };

  const getAvailableStatuses = (task: MotionTask) => {
    // Get statuses from the task's workspace
    const workspace = state.workspaces.find((w) => w.id === task.workspace.id);
    return workspace?.statuses || task.statuses || [];
  };

  const updateTaskStatus = async (task: MotionTask, newStatusName: string) => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Updating task status...",
      });

      // Find the status object
      const availableStatuses = getAvailableStatuses(task);
      const newStatus = availableStatuses.find((s) => s.name === newStatusName);

      if (!newStatus) {
        throw new Error(`Status "${newStatusName}" not found`);
      }

      const updatedTask = await updateTask(task.id, {
        status: newStatus,
      });

      // Update the task in our local state
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === task.id ? updatedTask : t)),
      }));

      showToast({
        style: Toast.Style.Success,
        title: "Status updated",
        message: `"${task.name}" → ${newStatusName}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const markTaskComplete = async (task: MotionTask) => {
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Marking task complete...",
      });

      await updateTask(task.id, {
        completed: true,
      });

      // Remove the completed task from our list
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== task.id),
      }));

      showToast({
        style: Toast.Style.Success,
        title: "Task completed",
        message: `"${task.name}" marked as complete`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const createQuickStatusActions = (task: MotionTask) => {
    const availableStatuses = getAvailableStatuses(task);
    const currentStatusName = task.status?.name || "";

    // Filter out the current status and get common quick actions
    const otherStatuses = availableStatuses.filter((s) => s.name !== currentStatusName);

    // Common status progressions with keyboard shortcuts
    const quickActions = [];

    // Add complete action (always available)
    quickActions.push(
      <Action
        key="complete"
        icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        title="Mark Complete"
        shortcut={{ modifiers: ["cmd"], key: "enter" }}
        onAction={() => markTaskComplete(task)}
      />,
    );

    // Look for common status transitions
    const todoStatuses = otherStatuses.filter(
      (s) =>
        s.name.toLowerCase().includes("todo") ||
        s.name.toLowerCase().includes("backlog") ||
        s.name.toLowerCase().includes("new"),
    );

    const progressStatuses = otherStatuses.filter(
      (s) =>
        s.name.toLowerCase().includes("progress") ||
        s.name.toLowerCase().includes("doing") ||
        s.name.toLowerCase().includes("active"),
    );

    const reviewStatuses = otherStatuses.filter(
      (s) => s.name.toLowerCase().includes("review") || s.name.toLowerCase().includes("testing"),
    );

    // Add quick actions with shortcuts
    if (todoStatuses.length > 0) {
      quickActions.push(
        <Action
          key="todo"
          icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          title={`Move to ${todoStatuses[0].name}`}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
          onAction={() => updateTaskStatus(task, todoStatuses[0].name)}
        />,
      );
    }

    if (progressStatuses.length > 0) {
      quickActions.push(
        <Action
          key="progress"
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          title={`Move to ${progressStatuses[0].name}`}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
          onAction={() => updateTaskStatus(task, progressStatuses[0].name)}
        />,
      );
    }

    if (reviewStatuses.length > 0) {
      quickActions.push(
        <Action
          key="review"
          icon={{ source: Icon.Eye, tintColor: Color.Orange }}
          title={`Move to ${reviewStatuses[0].name}`}
          shortcut={{ modifiers: ["cmd"], key: "3" }}
          onAction={() => updateTaskStatus(task, reviewStatuses[0].name)}
        />,
      );
    }

    return quickActions;
  };

  const createAllStatusActions = (task: MotionTask) => {
    const availableStatuses = getAvailableStatuses(task);
    const currentStatusName = task.status?.name || "";

    return availableStatuses
      .filter((status) => status.name !== currentStatusName)
      .map((status) => (
        <Action
          key={status.name}
          icon={getStatusIcon(status)}
          title={`Set Status: ${status.name}`}
          onAction={() => updateTaskStatus(task, status.name)}
        />
      ));
  };

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search tasks to update status...">
      {state.tasks.map((task) => (
        <List.Item
          key={task.id}
          icon={getStatusIcon(task.status)}
          title={task.name}
          subtitle={getTaskSubtitle(task)}
          accessories={[
            { icon: getPriorityIcon(task.priority) },
            ...(task.assignees.length > 0
              ? [{ text: task.assignees.map((a) => a.name.split(" ")[0]).join(", ") }]
              : []),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Quick Actions">{createQuickStatusActions(task)}</ActionPanel.Section>
              <ActionPanel.Section title="All Statuses">{createAllStatusActions(task)}</ActionPanel.Section>
              <ActionPanel.Section title="Other Actions">
                <Action.OpenInBrowser
                  title="Open in Motion"
                  url={`https://app.usemotion.com/tasks/${task.id}`}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Task Name"
                  content={task.name}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {state.tasks.length === 0 && !state.isLoading && (
        <List.EmptyView icon={Icon.CheckCircle} title="No Active Tasks" description="All your tasks are complete! 🎉" />
      )}
    </List>
  );
}
