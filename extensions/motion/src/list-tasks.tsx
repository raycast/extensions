import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Toast, showToast, Icon, confirmAlert } from "@raycast/api";
import { getMotionApiClient, Project } from "./api/motion";

// Define task types
interface Task {
  id?: string;
  name: string;
  description?: string;
  dueDate?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "ASAP";
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  label?: string;
  projectId?: string;
  workspaceId?: string;
  duration?: number | "NONE" | "REMINDER";
}

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [labels, setLabels] = useState<string[]>([]);

  // Load tasks and projects when the component mounts
  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  // Apply filters whenever search text, label filter, or project filter changes
  useEffect(() => {
    filterTasks();
  }, [tasks, searchText, selectedLabel, selectedProject]);

  // Load tasks from Motion API
  async function loadTasks() {
    setIsLoading(true);

    try {
      const motionClient = getMotionApiClient();
      const tasksData = await motionClient.getTasks();

      // Sort tasks by due date (most recent first)
      const sortedTasks = [...tasksData].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setTasks(sortedTasks);

      // Extract unique labels
      const uniqueLabels = new Set<string>();
      sortedTasks.forEach((task) => {
        if (task.label) {
          uniqueLabels.add(task.label);
        }
      });
      setLabels(Array.from(uniqueLabels).sort());

      // Apply initial filters
      filterTasks(sortedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Load projects from Motion API
  async function loadProjects() {
    try {
      const motionClient = getMotionApiClient();
      const projectsData = await motionClient.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Error loading projects:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
    }
  }

  // Filter tasks based on search text, label, and project
  function filterTasks(taskList = tasks) {
    let filtered = [...taskList];

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(
        (task) =>
          task.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchText.toLowerCase()))
      );
    }

    // Filter by label
    if (selectedLabel) {
      filtered = filtered.filter((task) => task.label === selectedLabel);
    }

    // Filter by project
    if (selectedProject) {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }

    setFilteredTasks(filtered);
  }

  // Format date for display
  function formatDate(dateString?: string): string {
    if (!dateString) return "No due date";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return "Invalid date";
    }
  }

  // Format status for display
  function formatStatus(status?: string): string {
    if (!status) return "No status";

    switch (status) {
      case "TODO":
        return "To Do";
      case "IN_PROGRESS":
        return "In Progress";
      case "DONE":
        return "Done";
      default:
        return String(status);
    }
  }

  // Get project name by ID
  function getProjectName(projectId?: string): string {
    if (!projectId) return "None";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : "Unknown Project";
  }

  // Get color for status tag
  function getStatusColor(status?: string): string {
    if (!status) return "";

    switch (status) {
      case "TODO":
        return "#FF9500";
      case "IN_PROGRESS":
        return "#007AFF";
      case "DONE":
        return "#34C759";
      default:
        return "";
    }
  }

  // Get icon for priority
  function getPriorityIcon(priority?: string) {
    if (!priority) return undefined;

    switch (priority) {
      case "ASAP":
        return { source: Icon.ExclamationMark, tintColor: "#FF3B30" };
      case "HIGH":
        return { source: Icon.ArrowUp, tintColor: "#FF9500" };
      case "MEDIUM":
        return { source: Icon.Dot, tintColor: "#007AFF" };
      case "LOW":
        return { source: Icon.ArrowDown, tintColor: "#34C759" };
      default:
        return undefined;
    }
  }

  // Reset filters
  function resetFilters() {
    setSelectedLabel(null);
    setSelectedProject(null);
    setSearchText("");
  }

  // Delete a task
  async function deleteTask(taskId: string) {
    try {
      // Show confirmation dialog
      const confirmed = await confirmAlert({
        title: "Delete Task",
        message: "Are you sure you want to delete this task? This action cannot be undone.",
        primaryAction: {
          title: "Delete",
        },
      });

      if (!confirmed) {
        return;
      }

      setIsLoading(true);
      const motionClient = getMotionApiClient();
      await motionClient.deleteTask(taskId);

      await showToast({
        style: Toast.Style.Success,
        title: "Task deleted",
      });

      // Reload tasks to update the list
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks by name or description..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Tasks"
          storeValue={true}
          onChange={(value) => {
            // Parse the filter type and value
            const [type, filterValue] = value.split(":");

            if (type === "label") {
              setSelectedLabel(filterValue === "all" ? null : filterValue);
              // Reset project filter if a label is selected
              setSelectedProject(null);
            } else if (type === "project") {
              setSelectedProject(filterValue === "all" ? null : filterValue);
              // Reset label filter if a project is selected
              setSelectedLabel(null);
            } else if (type === "all") {
              resetFilters();
            }
          }}
        >
          <List.Dropdown.Section title="Filter Type">
            <List.Dropdown.Item title="All Tasks" value="all" />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="By Label">
            <List.Dropdown.Item title="All Labels" value="label:all" />
            {labels.map((label) => (
              <List.Dropdown.Item key={`label-${label}`} title={label} value={`label:${label}`} />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="By Project">
            <List.Dropdown.Item title="All Projects" value="project:all" />
            {projects.map((project) => (
              <List.Dropdown.Item
                key={`project-${project.id}`}
                title={project.name}
                value={`project:${project.id}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      filtering={false}
      throttle
    >
      <List.Section
        title="Tasks"
        subtitle={`${filteredTasks.length} task${filteredTasks.length !== 1 ? "s" : ""}`}
      >
        {filteredTasks.length === 0 ? (
          <List.EmptyView
            title={
              searchText || selectedLabel || selectedProject
                ? "No matching tasks found"
                : "No tasks found"
            }
            description={
              searchText || selectedLabel || selectedProject
                ? "Try a different search term or clear filters"
                : "Add tasks in Motion or with the Add Task command"
            }
            icon={{ source: Icon.List }}
            actions={
              (searchText || selectedLabel || selectedProject) && (
                <ActionPanel>
                  <Action title="Clear Filters" onAction={resetFilters} icon={Icon.Filter} />
                  <Action title="Refresh Tasks" onAction={loadTasks} icon={Icon.ArrowClockwise} />
                </ActionPanel>
              )
            }
          />
        ) : (
          filteredTasks.map((task) => (
            <List.Item
              key={task.id}
              title={task.name}
              subtitle={task.description}
              icon={getPriorityIcon(task.priority)}
              accessories={[
                { text: task.label, icon: task.label ? Icon.Tag : undefined },
                { text: getProjectName(task.projectId) },
                { text: formatDate(task.dueDate), icon: Icon.Calendar },
                {
                  tag: {
                    value: formatStatus(task.status),
                    color: getStatusColor(task.status),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="Delete Task"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => deleteTask(task.id || "")}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      title="Open in Motion"
                      url={`https://app.usemotion.com/tasks/${task.id}`}
                    />
                    <Action.CopyToClipboard
                      title="Copy Task Id"
                      content={String(task.id)}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Task Details"
                      content={JSON.stringify(task, null, 2)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                    />
                    <Action
                      title="Refresh Tasks"
                      onAction={loadTasks}
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
