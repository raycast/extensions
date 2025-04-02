import { ActionPanel, Action, List, showToast, Toast, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { showFailureToast } from "@raycast/utils";
import { getMotionApiClient } from "./api/motion";

interface Task {
  id?: string;
  name: string;
  description?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
  status?: string;
  label?: string;
}

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  // Load tasks when the component mounts
  useEffect(() => {
    loadTasks();
  }, []);

  // Filter tasks based on search text
  useEffect(() => {
    if (!searchText) {
      setFilteredTasks(tasks);
      setFilteredTasks(tasks);
      return;
    }

    const filtered = tasks.filter(
      (task) =>
        task.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchText.toLowerCase()))
    );

    setFilteredTasks(filtered);
  }, [tasks, searchText]);

  // Load tasks from Motion API
  async function loadTasks() {
    setIsLoading(true);

    try {
      const motionClient = getMotionApiClient();
      const tasksData = await motionClient.getTasks();

      // Sort tasks by due date (most recent first)
      const sortedTasks = tasksData.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setTasks(sortedTasks);
      setFilteredTasks(sortedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      showFailureToast(error, {
        title: "Failed to load tasks",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Delete a task
  async function deleteTask(taskId?: string) {
    if (!taskId) {
      showFailureToast(new Error("Task ID is missing"), {
        title: "Cannot delete task",
      });
      return;
    }

    try {
      setIsLoading(true);
      const motionClient = getMotionApiClient();

      // Ask for confirmation before deleting
      const confirmed = await confirmAlert({
        title: "Delete Task",
        message: "Are you sure you want to delete this task? This action cannot be undone.",
        primaryAction: {
          title: "Delete",
        },
      });

      if (!confirmed) {
        setIsLoading(false);
        return;
      }

      await motionClient.deleteTask(taskId);

      // Remove the deleted task from the list
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));

      await showToast({
        style: Toast.Style.Success,
        title: "Task deleted",
        message: "The task has been removed from Motion",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      showFailureToast(error, {
        title: "Failed to delete task",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Get a relative description of the due date
  function getRelativeDate(dateString?: string): string {
    if (!dateString) return "Not scheduled";

    const dueDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const dueDay = new Date(dueDate);
    dueDay.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(dueDay.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dueDay < today) {
      // Past due
      if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
      } else {
        return "Over a month ago";
      }
    } else if (dueDay.getTime() === today.getTime()) {
      return "Today";
    } else if (dueDay.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      // Future due date
      if (diffDays < 7) {
        // Get the day name
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        return dayNames[dueDay.getDay()];
      } else if (diffDays < 14) {
        return "Next week";
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `In ${weeks} week${weeks > 1 ? "s" : ""}`;
      } else {
        return "In over a month";
      }
    }
  }

  // Safely get task status as string
  function getTaskStatus(status?: string): string {
    return status ? String(status) : "No Status";
  }

  // Safely get task priority as string with proper capitalization
  function getTaskPriority(priority?: string): string {
    if (!priority) return "No Priority";

    // Convert "HIGH" to "High", "MEDIUM" to "Medium", etc.
    switch (priority) {
      case "ASAP":
        return "ASAP";
      case "HIGH":
        return "High";
      case "MEDIUM":
        return "Medium";
      case "LOW":
        return "Low";
      default:
        return String(priority);
    }
  }

  // Safe HTML remover
  function removeHtml(text?: string): string {
    if (!text) return "";
    return text.replace(/<[^>]*>/g, "");
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="View options"
          storeValue={true}
          onChange={() => {
            /* This is just to create a header, no action needed */
          }}
        >
          <List.Dropdown.Item title="Task | Priority | Scheduled For" value="header" />
        </List.Dropdown>
      }
    >
      <List.Section title="Tasks" subtitle={filteredTasks.length.toString()}>
        {filteredTasks.map((task) => (
          <List.Item
            key={task.id}
            title={task.name}
            subtitle={removeHtml(task.description)}
            accessories={[
              {
                text: getTaskPriority(task.priority),
                tooltip: "Priority",
              },
              {
                text: getRelativeDate(task.dueDate),
                tooltip: "Scheduled For",
              },
              {
                tag: {
                  value: getTaskStatus(task.status),
                  color: task.status === "DONE" ? "#4CAF50" : undefined,
                },
                tooltip: "Status",
              },
            ]}
            actions={
              <ActionPanel>
                <Action title="Delete Task" onAction={() => deleteTask(task.id)} />
                <Action
                  title="Refresh Tasks"
                  onAction={loadTasks}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
