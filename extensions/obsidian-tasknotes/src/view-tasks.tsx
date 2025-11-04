import { ActionPanel, Action, List, Icon, Color, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getClient } from "./api/client";
import { Task } from "./api/types";
import { formatDate, isOverdue, isToday, getTaskId, formatProjects } from "./utils/formatters";
import EditTaskForm from "./edit-task";

type FilterType = "all" | "today" | "overdue";

export default function ViewTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("today");
  const [searchText, setSearchText] = useState("");

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const client = getClient();

      // Check API health first
      try {
        await client.checkHealth();
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "API Connection Failed",
          message: "Make sure TaskNotes API is running in Obsidian",
        });
        setIsLoading(false);
        return;
      }

      const response = await client.listTasks();

      if (response.success && response.data) {
        // Create a new array to ensure React detects the change
        setTasks([...response.data.tasks]);
      } else {
        throw new Error(response.error || "Failed to load tasks");
      }
    } catch (error) {
      showFailureToast(error, {
        title: "Failed to Load Tasks",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleCycleStatus = async (task: Task) => {
    try {
      const client = getClient();

      // Cycle through: open → in-progress → done → open
      let newStatus: string;
      let statusMessage: string;

      if (task.status === "open" || task.status === "none") {
        newStatus = "in-progress";
        statusMessage = "Task In Progress";
      } else if (task.status === "in-progress") {
        newStatus = "done";
        statusMessage = "Task Completed";
      } else if (task.status === "done" || task.status === "completed") {
        newStatus = "open";
        statusMessage = "Task Reopened";
      } else if (task.status === "holding") {
        newStatus = "in-progress";
        statusMessage = "Task In Progress";
      } else {
        newStatus = "in-progress";
        statusMessage = "Status Updated";
      }

      const response = await client.updateTask(getTaskId(task), { status: newStatus });

      if (response.success) {
        // Reload tasks first, then show success message
        await loadTasks();
        showToast({
          style: Toast.Style.Success,
          title: statusMessage,
        });
      } else {
        throw new Error(response.error || "Failed to update task status");
      }
    } catch (error) {
      showFailureToast(error, {
        title: "Action Failed",
      });
    }
  };

  const handleArchive = async (task: Task) => {
    try {
      const client = getClient();
      const response = await client.toggleArchive(getTaskId(task));

      if (response.success) {
        await loadTasks();
        showToast({
          style: Toast.Style.Success,
          title: "Task Archived",
        });
      } else {
        throw new Error(response.error || "Failed to archive task");
      }
    } catch (error) {
      showFailureToast(error, {
        title: "Action Failed",
      });
    }
  };

  const handleDelete = async (task: Task) => {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `Are you sure you want to delete "${task.title}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        const client = getClient();
        const response = await client.deleteTask(getTaskId(task));

        if (response.success) {
          await loadTasks();
          showToast({
            style: Toast.Style.Success,
            title: "Task Deleted",
          });
        } else {
          throw new Error(response.error || "Failed to delete task");
        }
      } catch (error) {
        showFailureToast(error, {
          title: "Action Failed",
        });
      }
    }
  };

  const getTaskIcon = (task: Task) => {
    // Check status first
    if (task.status === "done" || task.status === "completed") {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    if (task.status === "in-progress") {
      return { source: Icon.Circle, tintColor: Color.Blue };
    }
    if (task.status === "holding") {
      return { source: Icon.Pause, tintColor: Color.Orange };
    }
    if (task.status === "open") {
      // Show red for overdue open tasks, otherwise gray
      if (isOverdue(task.due)) {
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      }
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
    // For "none" or any other status
    if (isOverdue(task.due)) {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  };

  const getAccessories = (task: Task) => {
    const accessories = [];

    if (task.due) {
      const dueText = formatDate(task.due);
      accessories.push({
        text: dueText,
        icon: isOverdue(task.due) ? Icon.Clock : Icon.Calendar,
      });
    }

    if (task.priority) {
      let priorityIcon = Icon.Minus;
      let priorityColor = Color.SecondaryText;

      const p = task.priority.toLowerCase();
      if (p === "high" || p === "urgent") {
        priorityIcon = Icon.Important;
        priorityColor = Color.Red;
      } else if (p === "medium" || p === "normal") {
        priorityIcon = Icon.Dot;
        priorityColor = Color.Yellow;
      } else if (p === "low") {
        priorityIcon = Icon.Dot;
        priorityColor = Color.Green;
      }

      accessories.push({
        icon: { source: priorityIcon, tintColor: priorityColor },
        tooltip: `Priority: ${task.priority}`,
      });
    }

    return accessories;
  };

  // Apply filter type and search
  const filteredTasks = tasks
    .filter((task) => {
      // Filter out completed and archived tasks
      if (task.status === "done" || task.status === "completed" || task.archived) return false;

      // Apply filter type
      if (filter === "today") {
        // Show tasks due today or overdue
        return isToday(task.due) || isOverdue(task.due);
      } else if (filter === "overdue") {
        // Show only overdue tasks
        return isOverdue(task.due);
      }
      // "all" filter - show all open tasks
      return true;
    })
    .filter((task) => {
      // Apply search filter
      if (!searchText) return true;
      const search = searchText.toLowerCase();
      return (
        task.title.toLowerCase().includes(search) ||
        task.projects?.some((p) => p.toLowerCase().includes(search)) ||
        task.tags?.some((t) => t.toLowerCase().includes(search))
      );
    })
    .sort((a, b) => {
      // Sort by due date (overdue first, then by date)
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;

      const aOverdue = isOverdue(a.due);
      const bOverdue = isOverdue(b.due);

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      return new Date(a.due).getTime() - new Date(b.due).getTime();
    });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Tasks" value={filter} onChange={(newValue) => setFilter(newValue as FilterType)}>
          <List.Dropdown.Item title="Today (+ Overdue)" value="today" icon={Icon.Calendar} />
          <List.Dropdown.Item title="Overdue Only" value="overdue" icon={Icon.ExclamationMark} />
          <List.Dropdown.Item title="All Open Tasks" value="all" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {filteredTasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Tasks Found"
          description={filter === "today" ? "You're all caught up!" : "Try changing the filter"}
        />
      ) : (
        filteredTasks.map((task) => (
          <List.Item
            key={getTaskId(task)}
            icon={getTaskIcon(task)}
            title={task.title}
            subtitle={formatProjects(task.projects)}
            accessories={getAccessories(task)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Task"
                    icon={Icon.Pencil}
                    target={<EditTaskForm task={task} onSave={loadTasks} />}
                  />
                  <Action
                    title={
                      task.status === "done" || task.status === "completed"
                        ? "Reopen Task"
                        : task.status === "in-progress"
                          ? "Complete Task"
                          : "Start Task"
                    }
                    icon={
                      task.status === "done" || task.status === "completed"
                        ? Icon.Circle
                        : task.status === "in-progress"
                          ? Icon.CheckCircle
                          : Icon.Play
                    }
                    onAction={() => handleCycleStatus(task)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Archive Task"
                    icon={Icon.Box}
                    onAction={() => handleArchive(task)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                  <Action
                    title="Delete Task"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(task)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadTasks}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
