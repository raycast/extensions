import {
  ActionPanel,
  Action,
  Icon,
  List,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface Project {
  id: number;
  uid: string;
  name: string;
}

interface Tag {
  uid: string;
  name: string;
}

interface Task {
  id: number;
  uid: string;
  name: string;
  note?: string;
  status: number;
  priority: number;
  dueDate?: string;
  project_id?: number;
  tags?: Tag[];
  today?: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<{ apiUrl: string; token: string }>();
  const [tasks, setTasks] = useState<Task[]>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const currentFilterValue =
    statusFilter !== "all" ? `status-${statusFilter}` : projectFilter ? `project-${projectFilter}` : "status-all";

  useEffect(() => {
    async function load() {
      try {
        // Fetch projects
        const projectsRes = await fetch(`${preferences.apiUrl}/api/projects`, {
          headers: { Authorization: `Bearer ${preferences.token}` },
        });
        if (projectsRes.ok) {
          const projectsData = (await projectsRes.json()) as { projects: Project[] };
          setProjects(projectsData.projects.filter((p: Project) => p && p.id != null && p.name));
        }

        // Fetch tasks
        const tasksRes = await fetch(`${preferences.apiUrl}/api/tasks?type=today&client_side_filtering=true`, {
          headers: { Authorization: `Bearer ${preferences.token}` },
        });
        if (!tasksRes.ok) {
          throw new Error("Failed to fetch tasks");
        }
        const tasksData = (await tasksRes.json()) as { tasks?: Task[] };
        if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
          setTasks(tasksData.tasks);
        } else {
          throw new Error("Invalid tasks response");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [preferences.apiUrl, preferences.token]);

  async function updateTaskStatus(task: Task, newStatus: number) {
    try {
      // Prepare full task data with updated status
      const updatedTask = {
        name: task.name,
        priority: task.priority,
        ...(task.dueDate ? { due_date: new Date(task.dueDate).toISOString() } : {}),
        status: newStatus,
        note: task.note || "",
        ...(task.project_id ? { project_id: task.project_id } : {}),
        ...(task.tags ? { tags: task.tags } : {}),
      };

      // Update task
      const response = await fetch(`${preferences.apiUrl}/api/task/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preferences.token}`,
        },
        body: JSON.stringify(updatedTask),
      });

      if (response.ok) {
        const statusTexts = ["not started", "in progress", "completed", "archived", "waiting"];
        showToast({ title: `Task marked as ${statusTexts[newStatus]}`, style: Toast.Style.Success });
        // Update local state
        setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
      } else {
        showToast({ title: "Failed to update task", message: response.statusText, style: Toast.Style.Failure });
      }
    } catch (error) {
      showToast({ title: "Error", message: (error as Error).message, style: Toast.Style.Failure });
    }
  }

  async function updateTaskPriority(task: Task, newPriority: number) {
    try {
      // Prepare full task data with updated priority
      const updatedTask = {
        name: task.name,
        priority: newPriority,
        ...(task.dueDate ? { due_date: new Date(task.dueDate).toISOString() } : {}),
        status: task.status,
        note: task.note || "",
        ...(task.project_id ? { project_id: task.project_id } : {}),
        ...(task.tags ? { tags: task.tags } : {}),
      };

      // Update task
      const response = await fetch(`${preferences.apiUrl}/api/task/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preferences.token}`,
        },
        body: JSON.stringify(updatedTask),
      });

      if (response.ok) {
        const priorityTexts = ["low", "medium", "high"];
        showToast({ title: `Task priority set to ${priorityTexts[newPriority]}`, style: Toast.Style.Success });
        // Update local state
        setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, priority: newPriority } : t)));
      } else {
        showToast({ title: "Failed to update task", message: response.statusText, style: Toast.Style.Failure });
      }
    } catch (error) {
      showToast({ title: "Error", message: (error as Error).message, style: Toast.Style.Failure });
    }
  }

  async function toggleToday(task: Task) {
    try {
      console.log(`Toggling today for task ${task.id}`);
      // Toggle today
      const toggleUrl = `${preferences.apiUrl}/api/task/${task.id}/toggle-today`;
      console.log(`Calling ${toggleUrl}`);
      const response = await fetch(toggleUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preferences.token}`,
        },
      });
      console.log(`Response status: ${response.status}, ok: ${response.ok}, statusText: ${response.statusText}`);

      if (response.ok) {
        const newToday = !task.today;
        showToast({ title: `Task ${newToday ? "marked" : "unmarked"} for today`, style: Toast.Style.Success });
        // Update local state
        setTasks((prev) => prev?.map((t) => (t.id === task.id ? { ...t, today: newToday } : t)));
      } else {
        showToast({ title: "Failed to toggle today", message: response.statusText, style: Toast.Style.Failure });
      }
    } catch (error) {
      console.error("Error toggling today:", error);
      showToast({ title: "Error", message: (error as Error).message, style: Toast.Style.Failure });
    }
  }

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Not Started";
      case 1:
        return "In Progress";
      case 2:
        return "Done";
      case 3:
        return "Archived";
      case 4:
        return "Waiting";
      default:
        return "Unknown";
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 2:
        return Color.Red;
      case 1:
        return Color.Yellow;
      case 0:
        return Color.Blue;
      default:
        return Color.PrimaryText;
    }
  };

  if (error) {
    return (
      <List>
        <List.Item title="Error loading tasks" subtitle={error} />
      </List>
    );
  }

  const filteredTasks = tasks?.filter((task) => {
    const statusMatch = statusFilter === "all" || task.status.toString() === statusFilter;
    const projectMatch =
      !projectFilter ||
      (projectFilter === "no-project" ? !task.project_id : task.project_id?.toString() === projectFilter);
    const todayMatch = task.today === true;
    return statusMatch && projectMatch && todayMatch;
  });

  const handleFilterChange = (value: string) => {
    if (value.startsWith("status-")) {
      setStatusFilter(value.slice(7));
      setProjectFilter("");
    } else if (value.startsWith("project-")) {
      setProjectFilter(value.slice(8));
      setStatusFilter("all");
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Tasks" value={currentFilterValue} onChange={handleFilterChange}>
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="All" value="status-all" />
            <List.Dropdown.Item title="Not Started" value="status-0" />
            <List.Dropdown.Item title="In Progress" value="status-1" />
            <List.Dropdown.Item title="Done" value="status-2" />
            <List.Dropdown.Item title="Archived" value="status-3" />
            <List.Dropdown.Item title="Waiting" value="status-4" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Project">
            <List.Dropdown.Item title="All Projects" value="project-" />
            <List.Dropdown.Item title="No Project" value="project-no-project" />
            {projects.map((project) => (
              <List.Dropdown.Item key={`project-${project.id}`} value={`project-${project.id}`} title={project.name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredTasks?.map((task) => {
        const projectName = task.project_id ? projects.find((p) => p.id === task.project_id)?.name : "";
        return (
          <List.Item
            key={task.id}
            icon={{
              source: task.status === 2 ? Icon.CheckCircle : Icon.Circle,
              tintColor: getPriorityColor(task.priority),
            }}
            title={task.name}
            subtitle={task.note}
            accessories={[
              { text: getStatusText(task.status) },
              ...(projectName ? [{ icon: Icon.Folder, text: projectName }] : []),
              ...(task.dueDate ? [{ text: new Date(task.dueDate).toLocaleDateString() }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={
                    <TaskDetail
                      task={task}
                      projects={projects}
                      updateTaskStatus={updateTaskStatus}
                      updateTaskPriority={updateTaskPriority}
                      toggleToday={toggleToday}
                    />
                  }
                />
                <Action.OpenInBrowser url={`${preferences.apiUrl}/task/${task.uid}`} />
                <Action
                  title={task.today ? "Unmark from Today" : "Mark for Today"}
                  onAction={() => toggleToday(task)}
                />
                <ActionPanel.Submenu title="Change Status" shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}>
                  <Action title="Not Started" onAction={() => updateTaskStatus(task, 0)} />
                  <Action title="In Progress" onAction={() => updateTaskStatus(task, 1)} />
                  <Action title="Done" onAction={() => updateTaskStatus(task, 2)} />
                  <Action title="Archived" onAction={() => updateTaskStatus(task, 3)} />
                  <Action title="Waiting" onAction={() => updateTaskStatus(task, 4)} />
                </ActionPanel.Submenu>
                <ActionPanel.Submenu title="Change Priority">
                  <Action title="Low" onAction={() => updateTaskPriority(task, 0)} />
                  <Action title="Medium" onAction={() => updateTaskPriority(task, 1)} />
                  <Action title="High" onAction={() => updateTaskPriority(task, 2)} />
                </ActionPanel.Submenu>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function TaskDetail({
  task,
  projects,
  updateTaskStatus,
  updateTaskPriority,
  toggleToday,
}: {
  task: Task;
  projects: Project[];
  updateTaskStatus: (task: Task, newStatus: number) => Promise<void>;
  updateTaskPriority: (task: Task, newPriority: number) => Promise<void>;
  toggleToday: (task: Task) => Promise<void>;
}) {
  const preferences = getPreferenceValues<{ apiUrl: string; token: string }>();
  const { pop } = useNavigation();

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Not Started";
      case 1:
        return "In Progress";
      case 2:
        return "Done";
      case 3:
        return "Archived";
      case 4:
        return "Waiting";
      default:
        return "Unknown";
    }
  };

  const projectName = task.project_id ? projects.find((p) => p.id === task.project_id)?.name : null;
  const tagsText = task.tags?.map((t) => t.name).join(", ") || null;
  const markdown = `# ${task.name}

**Status:** ${getStatusText(task.status)}${
    task.dueDate
      ? `  
**Due Date:** ${new Date(task.dueDate).toLocaleDateString()}`
      : ""
  }

${projectName || tagsText ? `${projectName ? `📁 ${projectName}` : ""}${projectName && tagsText ? " | " : ""}${tagsText ? `🏷️ ${tagsText}` : ""}\n\n` : ""}

${task.today ? "**Marked for Today**\n\n" : ""}${task.note || "No notes available."}`;

  const isCompleted = task.status === 2;
  const actionTitle = isCompleted ? "Mark as Not Started" : "Complete Task";
  const newStatus = isCompleted ? 0 : 2;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title={actionTitle} onAction={() => updateTaskStatus(task, newStatus).then(() => pop())} />
          <Action.OpenInBrowser url={`${preferences.apiUrl}/task/${task.uid}`} />
          <Action title={task.today ? "Unmark from Today" : "Mark for Today"} onAction={() => toggleToday(task)} />
          <ActionPanel.Submenu title="Change Status" shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}>
            <Action title="Not Started" onAction={() => updateTaskStatus(task, 0)} />
            <Action title="In Progress" onAction={() => updateTaskStatus(task, 1)} />
            <Action title="Done" onAction={() => updateTaskStatus(task, 2)} />
            <Action title="Archived" onAction={() => updateTaskStatus(task, 3)} />
            <Action title="Waiting" onAction={() => updateTaskStatus(task, 4)} />
          </ActionPanel.Submenu>
          <ActionPanel.Submenu title="Change Priority">
            <Action title="Low" onAction={() => updateTaskPriority(task, 0)} />
            <Action title="Medium" onAction={() => updateTaskPriority(task, 1)} />
            <Action title="High" onAction={() => updateTaskPriority(task, 2)} />
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    />
  );
}
