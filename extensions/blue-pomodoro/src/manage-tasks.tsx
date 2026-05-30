import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  LocalStorage,
  Form,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchTasks, createTask, updateTask, TaskData } from "./utils/api";

export default function Command() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const { push } = useNavigation();

  // Load tasks and active task ID
  async function loadTasks() {
    try {
      setLoading(true);
      const list = await fetchTasks();
      setTasks(list);
      const activeId = await LocalStorage.getItem<string>(
        "timer-active-task-id",
      );
      setActiveTaskId(activeId || null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading tasks",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  // Filter tasks based on dropdown selection
  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "pending")
      return task.status === "Pendiente" || task.status === "En Proceso";
    if (filter === "completed") return task.status === "Completada";
    return true;
  });

  // Action handlers
  async function handleToggleStatus(task: TaskData) {
    const nextStatus =
      task.status === "Completada" ? "Pendiente" : "Completada";
    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Updating task...",
      });
      await updateTask(task.id, { status: nextStatus });
      showToast({
        style: Toast.Style.Success,
        title: `Task marked as ${nextStatus === "Completada" ? "completed" : "pending"}`,
      });
      loadTasks();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    }
  }

  async function handleSetActive(task: TaskData) {
    try {
      const isCurrentActive = activeTaskId === task.id;
      if (isCurrentActive) {
        await LocalStorage.removeItem("timer-active-task-id");
        await LocalStorage.removeItem("timer-active-task-title");
        setActiveTaskId(null);
        showToast({ style: Toast.Style.Success, title: "Active task cleared" });
      } else {
        await LocalStorage.setItem("timer-active-task-id", task.id);
        await LocalStorage.setItem("timer-active-task-title", task.title);
        setActiveTaskId(task.id);
        showToast({
          style: Toast.Style.Success,
          title: "Focus task updated",
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    }
  }

  async function handleIncrementPomo(task: TaskData) {
    try {
      showToast({ style: Toast.Style.Animated, title: "Adding pomodoro..." });
      await updateTask(task.id, {
        pomodoros_completed: task.pomodoros_completed + 1,
      });
      showToast({ style: Toast.Style.Success, title: "Pomodoro added" });
      loadTasks();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    }
  }

  function handleCreateTaskView() {
    push(<CreateTaskForm onTaskCreated={() => loadTasks()} />);
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search tasks by title..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by status"
          onChange={(val: string) => setFilter(val)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Pending / In Progress" value="pending" />
          <List.Dropdown.Item title="Completed" value="completed" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title="No Tasks Found"
        description="Press Enter to create a new task now."
        actions={
          <ActionPanel>
            <Action
              title="Create Task"
              icon={Icon.Plus}
              onAction={handleCreateTaskView}
            />
          </ActionPanel>
        }
      />

      <List.Section title="My Tasks" subtitle={`${filteredTasks.length} tasks`}>
        {filteredTasks.map((task) => {
          const isActive = activeTaskId === task.id;
          const isCompleted = task.status === "Completada";

          const statusIcon =
            task.status === "Completada"
              ? { source: Icon.Checkmark, tintColor: Color.Green }
              : task.status === "En Proceso"
                ? { source: Icon.Play, tintColor: Color.Orange }
                : Icon.Circle;

          const accessories: List.Item.Accessory[] = [];
          if (isActive) {
            accessories.push({
              tag: { value: "Active Focus", color: Color.Blue },
            });
          }
          accessories.push({
            text: `🍅 ${task.pomodoros_completed}/${task.effort_estimated}`,
          });
          if (task.priority) {
            accessories.push({
              tag: {
                value:
                  task.priority === "Alta"
                    ? "High"
                    : task.priority === "Baja"
                      ? "Low"
                      : "Medium",
                color:
                  task.priority === "Alta"
                    ? Color.Red
                    : task.priority === "Baja"
                      ? "#94a3b8"
                      : Color.Yellow,
              },
            });
          }

          return (
            <List.Item
              key={task.id}
              icon={statusIcon}
              title={task.title}
              subtitle={
                task.status === "Pendiente"
                  ? "Pending"
                  : task.status === "En Proceso"
                    ? "In Progress"
                    : "Completed"
              }
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title={
                      isActive
                        ? "Remove Active Focus Task"
                        : "Set Active Focus Task"
                    }
                    icon={isActive ? Icon.StarDisabled : Icon.Star}
                    onAction={() => handleSetActive(task)}
                  />
                  <Action
                    title={
                      isCompleted ? "Mark as Pending" : "Mark as Completed"
                    }
                    icon={
                      isCompleted
                        ? Icon.Circle
                        : { source: Icon.Checkmark, tintColor: Color.Green }
                    }
                    onAction={() => handleToggleStatus(task)}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="Add Completed Pomodoro"
                    icon={Icon.Plus}
                    onAction={() => handleIncrementPomo(task)}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
                  />
                  <Action
                    title="Create New Task"
                    icon={Icon.Plus}
                    onAction={handleCreateTaskView}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Reload List"
                    icon={Icon.ArrowClockwise}
                    onAction={loadTasks}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function CreateTaskForm({ onTaskCreated }: { onTaskCreated: () => void }) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: {
    title: string;
    priority: string;
    effort: string;
  }) {
    if (!values.title.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Task title is required.",
      });
      return;
    }

    try {
      setLoading(true);
      showToast({ style: Toast.Style.Animated, title: "Creating task..." });
      // Translate priorities back to what DB expects ("Alta", "Media", "Baja")
      const dbPriority =
        values.priority === "High"
          ? "Alta"
          : values.priority === "Low"
            ? "Baja"
            : "Media";
      const effort = parseInt(values.effort) || 1;
      await createTask(values.title, dbPriority, effort);
      showToast({ style: Toast.Style.Success, title: "Task created" });
      onTaskCreated();
      pop();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      showToast({
        style: Toast.Style.Failure,
        title: "Error creating task",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Task Title"
        placeholder="Enter task name..."
        autoFocus
      />
      <Form.Dropdown id="priority" title="Priority" defaultValue="Medium">
        <Form.Dropdown.Item title="High" value="High" />
        <Form.Dropdown.Item title="Medium" value="Medium" />
        <Form.Dropdown.Item title="Low" value="Low" />
      </Form.Dropdown>
      <Form.TextField
        id="effort"
        title="Estimated Pomodoros"
        defaultValue="1"
        placeholder="e.g. 4"
      />
    </Form>
  );
}
