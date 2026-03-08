import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import {
  getProjects,
  getProjectTasks,
  toggleTaskDone,
  deleteTask,
  Project,
  Task,
  PRIORITY_MAP,
} from "./api";

const PRIORITY_COLORS: Record<number, Color> = {
  0: Color.SecondaryText,
  1: Color.Blue,
  2: Color.Yellow,
  3: Color.Orange,
  4: Color.Red,
  5: Color.Magenta,
};

function formatDueDate(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  if (date.getFullYear() <= 1) return undefined;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dueDateColor(dueDate: string | null): Color | undefined {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  if (date.getFullYear() <= 1) return undefined;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return Color.Red;
  if (days <= 1) return Color.Orange;
  if (days <= 3) return Color.Yellow;
  return undefined;
}

export default function ListTasks() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      try {
        const p = await getProjects();
        setProjects(p);
        // Default to first project (usually Inbox)
        if (p.length > 0) {
          const inbox = p.find((proj) => proj.title.toLowerCase() === "inbox");
          setSelectedProject(String(inbox?.id ?? p[0].id));
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    loadProjects();
  }, []);

  const loadTasks = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const t = await getProjectTasks(parseInt(projectId));
      setTasks(t);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject);
    }
  }, [selectedProject, loadTasks]);

  async function handleToggleDone(task: Task) {
    try {
      await toggleTaskDone(task);
      showToast({
        style: Toast.Style.Success,
        title: task.done ? "Task reopened" : "Task completed",
      });
      loadTasks(selectedProject);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(task: Task) {
    if (
      await confirmAlert({
        title: `Delete "${task.title}"?`,
        message: "This cannot be undone.",
      })
    ) {
      try {
        await deleteTask(task.id);
        showToast({ style: Toast.Style.Success, title: "Task deleted" });
        loadTasks(selectedProject);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete task",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  const { apiUrl } = getPreferenceValues<Preferences>();
  const baseUrl = apiUrl.replace(/\/+$/, "");

  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Project"
          value={selectedProject}
          onChange={setSelectedProject}
        >
          {projects.map((project) => (
            <List.Dropdown.Item
              key={project.id}
              value={String(project.id)}
              title={project.title}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Open" subtitle={`${openTasks.length} tasks`}>
        {openTasks.map((task) => (
          <TaskListItem
            key={task.id}
            task={task}
            baseUrl={baseUrl}
            onToggleDone={handleToggleDone}
            onDelete={handleDelete}
            onRefresh={() => loadTasks(selectedProject)}
          />
        ))}
      </List.Section>
      {doneTasks.length > 0 && (
        <List.Section title="Done" subtitle={`${doneTasks.length} tasks`}>
          {doneTasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              baseUrl={baseUrl}
              onToggleDone={handleToggleDone}
              onDelete={handleDelete}
              onRefresh={() => loadTasks(selectedProject)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function TaskListItem({
  task,
  baseUrl,
  onToggleDone,
  onDelete,
  onRefresh,
}: {
  task: Task;
  baseUrl: string;
  onToggleDone: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
}) {
  const dueText = formatDueDate(task.due_date);
  const dueColor = dueDateColor(task.due_date);

  const accessories: List.Item.Accessory[] = [];

  if (task.labels?.length > 0) {
    for (const label of task.labels) {
      accessories.push({
        tag: { value: label.title, color: label.hex_color as Color },
      });
    }
  }

  if (task.priority > 0) {
    accessories.push({
      tag: {
        value: PRIORITY_MAP[task.priority] ?? `P${task.priority}`,
        color: PRIORITY_COLORS[task.priority],
      },
    });
  }

  if (dueText) {
    accessories.push({ text: { value: dueText, color: dueColor } });
  }

  if (task.is_favorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  return (
    <List.Item
      title={task.title}
      subtitle={task.description?.slice(0, 60)}
      icon={
        task.done
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : Icon.Circle
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={task.done ? "Reopen Task" : "Complete Task"}
              icon={task.done ? Icon.Circle : Icon.CheckCircle}
              onAction={() => onToggleDone(task)}
            />
            <Action.OpenInBrowser
              title="Open in Vikunja"
              url={`${baseUrl}/tasks/${task.id}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Task Title"
              content={task.title}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Task URL"
              content={`${baseUrl}/tasks/${task.id}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Delete Task"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => onDelete(task)}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
