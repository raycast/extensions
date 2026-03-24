import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  getPreferenceValues,
  LaunchProps,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getProjects,
  getProjectTasks,
  getAllTasks,
  toggleTaskDone,
  deleteTask,
  updateTask,
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
  now.setHours(0, 0, 0, 0);
  const dueDay = new Date(date);
  dueDay.setHours(0, 0, 0, 0);
  const days = Math.round(
    (dueDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
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
  now.setHours(0, 0, 0, 0);
  const dueDay = new Date(date);
  dueDay.setHours(0, 0, 0, 0);
  const days = Math.round(
    (dueDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return Color.Red;
  if (days <= 1) return Color.Orange;
  if (days <= 3) return Color.Yellow;
  return undefined;
}

interface ListTasksContext {
  projectId?: number;
}

export default function ListTasks(
  props: LaunchProps<{ launchContext: ListTasksContext }>,
) {
  const initialProjectId = props.launchContext?.projectId;
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(
    initialProjectId ? String(initialProjectId) : "all",
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const p = await getProjects();
        setProjects(p);
        setProjectsError(null);
        // Set project after dropdown items are available
        if (
          initialProjectId &&
          p.some((proj) => proj.id === initialProjectId)
        ) {
          setSelectedProject(String(initialProjectId));
        } else if (initialProjectId) {
          setSelectedProject("all");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setProjectsError(message);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects",
          message,
        });
      }
    }
    loadProjects();
  }, []);

  const loadTasks = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const t =
        projectId === "all"
          ? await getAllTasks()
          : await getProjectTasks(parseInt(projectId));
      setTasks(t);
      setTasksError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setTasks([]);
      setTasksError(message);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message,
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

  const baseUrl = useMemo(() => {
    const { apiUrl } = getPreferenceValues<Preferences>();
    return apiUrl.replace(/\/+$/, "");
  }, []);

  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  const showEmptyView =
    !isLoading && (tasksError !== null || tasks.length === 0);

  let emptyTitle = "No tasks";
  let emptyDescription =
    selectedProject === "all"
      ? "There are no tasks in your Vikunja instance yet."
      : "There are no tasks in this project. Try another project or create tasks in Vikunja.";
  if (tasksError) {
    emptyTitle = "Failed to load tasks";
    emptyDescription = tasksError;
  } else if (projectsError && tasks.length === 0) {
    emptyTitle = "Failed to load projects";
    emptyDescription = projectsError;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Project"
          value={selectedProject}
          onChange={setSelectedProject}
        >
          <List.Dropdown.Item key="all" value="all" title="All Projects" />
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
      {showEmptyView ? (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={tasksError || projectsError ? Icon.Warning : Icon.Tray}
        />
      ) : (
        <>
          <List.Section title="Open" subtitle={`${openTasks.length} tasks`}>
            {openTasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                baseUrl={baseUrl}
                projects={projects}
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
                  projects={projects}
                  onToggleDone={handleToggleDone}
                  onDelete={handleDelete}
                  onRefresh={() => loadTasks(selectedProject)}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

function TaskListItem({
  task,
  baseUrl,
  projects,
  onToggleDone,
  onDelete,
  onRefresh,
}: {
  task: Task;
  baseUrl: string;
  projects: Project[];
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
            <EditTaskAction
              task={task}
              projects={projects}
              onRefresh={onRefresh}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Quick Actions">
            <ActionPanel.Submenu
              title="Set Priority…"
              icon={Icon.Signal3}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            >
              {Object.entries(PRIORITY_MAP).map(([value, label]) => (
                <Action
                  key={value}
                  title={label}
                  icon={
                    task.priority === parseInt(value)
                      ? Icon.CheckCircle
                      : Icon.Circle
                  }
                  onAction={async () => {
                    try {
                      await updateTask(task.id, { priority: parseInt(value) });
                      showToast({
                        style: Toast.Style.Success,
                        title: `Priority set to ${label}`,
                      });
                      onRefresh();
                    } catch (error) {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Failed to set priority",
                        message:
                          error instanceof Error
                            ? error.message
                            : "Unknown error",
                      });
                    }
                  }}
                />
              ))}
            </ActionPanel.Submenu>
            <Action
              title={task.is_favorite ? "Remove Favorite" : "Add Favorite"}
              icon={task.is_favorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => {
                try {
                  await updateTask(task.id, { is_favorite: !task.is_favorite });
                  showToast({
                    style: Toast.Style.Success,
                    title: task.is_favorite
                      ? "Removed from favorites"
                      : "Added to favorites",
                  });
                  onRefresh();
                } catch (error) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to toggle favorite",
                    message:
                      error instanceof Error ? error.message : "Unknown error",
                  });
                }
              }}
            />
            <ActionPanel.Submenu
              title="Move to Project…"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            >
              {projects
                .filter((p) => p.id !== task.project_id)
                .map((p) => (
                  <Action
                    key={p.id}
                    title={p.title}
                    onAction={async () => {
                      try {
                        await updateTask(task.id, { project_id: p.id });
                        showToast({
                          style: Toast.Style.Success,
                          title: `Moved to ${p.title}`,
                        });
                        onRefresh();
                      } catch (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to move task",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unknown error",
                        });
                      }
                    }}
                  />
                ))}
            </ActionPanel.Submenu>
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

function EditTaskAction({
  task,
  projects,
  onRefresh,
}: {
  task: Task;
  projects: Project[];
  onRefresh: () => void;
}) {
  const { push } = useNavigation();
  return (
    <Action
      title="Edit Task"
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      onAction={() =>
        push(
          <EditTaskForm
            task={task}
            projects={projects}
            onRefresh={onRefresh}
          />,
        )
      }
    />
  );
}

function EditTaskForm({
  task,
  projects,
  onRefresh,
}: {
  task: Task;
  projects: Project[];
  onRefresh: () => void;
}) {
  const { pop } = useNavigation();

  const dueDate =
    task.due_date && new Date(task.due_date).getFullYear() > 1
      ? new Date(task.due_date)
      : null;

  async function handleSubmit(values: {
    title: string;
    description: string;
    projectId: string;
    dueDate: Date | null;
    priority: string;
    isFavorite: boolean;
  }) {
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    try {
      await updateTask(task.id, {
        title: values.title.trim(),
        description: values.description?.trim() || "",
        due_date: values.dueDate ? values.dueDate.toISOString() : null,
        priority: parseInt(values.priority) || 0,
        is_favorite: values.isFavorite,
        project_id: parseInt(values.projectId),
      });
      showToast({ style: Toast.Style.Success, title: "Task updated" });
      onRefresh();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={task.title} />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={task.description}
      />
      <Form.Dropdown
        id="projectId"
        title="Project"
        defaultValue={String(task.project_id)}
      >
        {projects.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.title} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={dueDate}
      />
      <Form.Dropdown
        id="priority"
        title="Priority"
        defaultValue={String(task.priority)}
      >
        {Object.entries(PRIORITY_MAP).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="isFavorite"
        title="Favorite"
        label="Mark as favorite"
        defaultValue={task.is_favorite}
      />
    </Form>
  );
}
