import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import CreateTask from "./create-task";
import EditTask from "./edit-task";
import { isAuthenticated, makeAuthenticatedRequest } from "./lib/auth";
import StartTimer from "./start-timer";
import { Project, Task } from "./types";

export default function ListTasks() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const authenticated = await isAuthenticated();
    setIsAuth(authenticated);

    if (authenticated) {
      await Promise.all([loadTasks(), loadProjects()]);
    } else {
      setIsLoading(false);
    }
  }

  async function loadTasks() {
    try {
      const response = await makeAuthenticatedRequest("/tasks");

      if (response.ok) {
        const data = await response.json();
        setTasks((data as Task[]) || []);
      } else if (response.status === 401) {
        setIsAuth(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: "Please check your credentials in Preferences",
        });
      } else {
        throw new Error("Failed to load tasks");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load tasks",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const response = await makeAuthenticatedRequest("/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects((data as Project[]) || []);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }

  async function toggleTaskComplete(task: Task) {
    try {
      const response = await makeAuthenticatedRequest(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (response.ok) {
        await loadTasks();
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: task.completed ? "Task marked as incomplete" : "Task completed",
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to update task",
      });
    }
  }

  async function deleteTask(task: Task) {
    try {
      const response = await makeAuthenticatedRequest(`/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadTasks();
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Task deleted",
        });
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to delete task",
      });
    }
  }

  function getPriorityIcon(priority: string) {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      case "high":
        return { source: Icon.Flag, tintColor: Color.Orange };
      case "medium":
        return { source: Icon.Flag, tintColor: Color.Yellow };
      case "low":
        return { source: Icon.Flag, tintColor: Color.Blue };
      default:
        return Icon.Flag;
    }
  }

  function getProjectById(projectId?: string | null) {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId);
  }

  function getDaysUntilDue(dueDate?: string | null) {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function getDueDateColor(daysUntil: number | null) {
    if (daysUntil === null) return undefined;
    if (daysUntil < 0) return Color.Red;
    if (daysUntil === 0) return Color.Orange;
    if (daysUntil <= 3) return Color.Yellow;
    return Color.Green;
  }

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by status
    if (filterStatus === "active") {
      filtered = filtered.filter((task) => !task.completed);
    } else if (filterStatus === "completed") {
      filtered = filtered.filter((task) => task.completed);
    }

    // Filter by search text
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(search) ||
          task.description?.toLowerCase().includes(search) ||
          getProjectById(task.project_id)?.name.toLowerCase().includes(search),
      );
    }

    // Sort tasks: incomplete first, then by priority, then by due date
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;

      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 4;
      const bPriority = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 4;
      if (aPriority !== bPriority) return aPriority - bPriority;

      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return 0;
    });
  }, [tasks, searchText, filterStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const overdue = tasks.filter((t) => !t.completed && t.due_date && new Date(t.due_date) < new Date()).length;
    const urgent = tasks.filter((t) => !t.completed && t.priority?.toLowerCase() === "urgent").length;

    return { total, completed, active, overdue, urgent };
  }, [tasks]);

  if (isAuth === false) {
    return (
      <Detail
        markdown={"Please set your Braintick email and password in Raycast Preferences."}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks, projects..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Tasks"
          value={filterStatus}
          onChange={(value) => setFilterStatus(value as typeof filterStatus)}
        >
          <List.Dropdown.Item title={`All Tasks (${stats.total})`} value="all" icon={Icon.List} />
          <List.Dropdown.Item title={`Active (${stats.active})`} value="active" icon={Icon.Circle} />
          <List.Dropdown.Item title={`Completed (${stats.completed})`} value="completed" icon={Icon.CheckCircle} />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Tasks"
        subtitle={`${stats.active} active • ${stats.completed} completed • ${stats.overdue} overdue`}
      >
        {filteredTasks.length === 0 ? (
          <List.Item
            icon={Icon.Checkmark}
            title={searchText ? "No tasks found" : "No tasks yet"}
            subtitle={searchText ? "Try a different search" : "Create your first task to get started"}
            actions={
              <ActionPanel>
                <Action.Push title="Create Task" icon={Icon.Plus} target={<CreateTask onTaskCreated={loadTasks} />} />
              </ActionPanel>
            }
          />
        ) : (
          filteredTasks.map((task) => {
            const project = getProjectById(task.project_id);
            const daysUntil = getDaysUntilDue(task.due_date);
            const dueDateColor = getDueDateColor(daysUntil);

            let dueDateText = "";
            if (daysUntil !== null) {
              if (daysUntil < 0) dueDateText = `${Math.abs(daysUntil)} days overdue`;
              else if (daysUntil === 0) dueDateText = "Due today";
              else if (daysUntil === 1) dueDateText = "Due tomorrow";
              else dueDateText = `Due in ${daysUntil} days`;
            }

            return (
              <List.Item
                key={task.id}
                icon={task.completed ? Icon.CheckCircle : Icon.Circle}
                title={task.title}
                subtitle={task.description || undefined}
                keywords={[task.priority || "", project?.name || "", task.title]}
                accessories={
                  [
                    project && {
                      tag: { value: project.name, color: project.color as Color },
                      tooltip: `Project: ${project.name}`,
                    },
                    task.priority && {
                      icon: getPriorityIcon(task.priority),
                      tooltip: `Priority: ${task.priority}`,
                    },
                    task.due_date && {
                      tag: { value: dueDateText, color: dueDateColor },
                      icon: Icon.Calendar,
                      tooltip: new Date(task.due_date).toLocaleDateString(),
                    },
                    task.sync_with_huly && {
                      icon: { source: Icon.ArrowClockwise, tintColor: Color.Blue },
                      tooltip: "Synced with Huly",
                    },
                  ].filter(Boolean) as List.Item.Accessory[]
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title={task.completed ? "Mark as Incomplete" : "Mark as Complete"}
                        icon={task.completed ? Icon.Circle : Icon.CheckCircle}
                        onAction={() => toggleTaskComplete(task)}
                      />
                      <Action.Push
                        title="Start Timer for Task"
                        icon={Icon.Clock}
                        target={
                          <StartTimer
                            defaultProjectId={task.project_id || undefined}
                            defaultTaskId={task.id}
                            onTimerStarted={() => {
                              showToast({
                                style: Toast.Style.Success,
                                title: "Timer Started",
                                message: `Tracking time for ${task.title}`,
                              });
                            }}
                          />
                        }
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action.Push
                        title="Edit Task"
                        icon={Icon.Pencil}
                        target={<EditTask task={task} onTaskUpdated={loadTasks} />}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                      <Action.Push
                        title="Show Details"
                        icon={Icon.Eye}
                        target={
                          <Detail
                            markdown={`# ${task.title}

${task.description || "*No description*"}

---

**Status:** ${task.completed ? "✅ Completed" : "⏳ Pending"}  
**Priority:** ${task.priority ? `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` : "None"}  
${task.due_date ? `**Due Date:** ${new Date(task.due_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}` : ""}  
${project ? `**Project:** ${project.name}` : ""}  
${task.sync_with_huly ? "\n🔄 **Synced with Huly**" : ""}

${task.created_at ? `\n---\n\n*Created: ${new Date(task.created_at).toLocaleDateString()}*` : ""}`}
                            actions={
                              <ActionPanel>
                                <Action.Push
                                  title="Edit Task"
                                  icon={Icon.Pencil}
                                  target={<EditTask task={task} onTaskUpdated={loadTasks} />}
                                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                                />
                                <Action
                                  title={task.completed ? "Mark as Incomplete" : "Mark as Complete"}
                                  icon={task.completed ? Icon.Circle : Icon.CheckCircle}
                                  onAction={() => toggleTaskComplete(task)}
                                />
                              </ActionPanel>
                            }
                          />
                        }
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                      <Action.Push
                        title="Create Task"
                        icon={Icon.Plus}
                        target={
                          <CreateTask onTaskCreated={loadTasks} defaultProjectId={task.project_id || undefined} />
                        }
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action
                        title="Delete Task"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => deleteTask(task)}
                        shortcut={{ modifiers: ["cmd"], key: "delete" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List.Section>
    </List>
  );
}
