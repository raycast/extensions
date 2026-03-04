import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  appendToTasks,
  getTodayTasks,
  toggleTodayTask,
  type DailyTask,
} from "./utils/octarine";

interface AddTaskFormValues {
  text: string;
}

interface AddTaskFormProps {
  onTaskAdded: () => Promise<void>;
}

function AddTaskForm({ onTaskAdded }: AddTaskFormProps) {
  const { pop } = useNavigation();
  const [text, setText] = useState("");

  async function handleSubmit(values: AddTaskFormValues) {
    if (!values.text || values.text.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty task",
        message: "Enter a task before saving",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding task...",
    });

    try {
      await appendToTasks(values.text.trim());
      await onTaskAdded();

      toast.style = Toast.Style.Success;
      toast.title = "Task added";
      await pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add task";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Task"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Task"
        placeholder="What needs to get done?"
        value={text}
        onChange={setText}
        autoFocus
      />
      <Form.Description text="⌘S — save task" />
    </Form>
  );
}

export default function Command() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const loadTasks = useCallback(async () => {
    setIsLoading(true);

    try {
      const todayTasks = await getTodayTasks();
      setTasks(todayTasks);
      setErrorMessage(undefined);
    } catch (error) {
      setTasks([]);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleToggleTask(task: DailyTask) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: task.completed
        ? "Marking task as open..."
        : "Marking task as done...",
    });

    try {
      await toggleTodayTask(task.id);
      await loadTasks();

      toast.style = Toast.Style.Success;
      toast.title = task.completed ? "Task reopened" : "Task completed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update task";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  const openTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  const defaultActions = (
    <ActionPanel>
      <Action.Push
        title="Add Task"
        icon={Icon.Plus}
        target={<AddTaskForm onTaskAdded={loadTasks} />}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={loadTasks}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );

  if (errorMessage) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="Cannot Load Tasks"
          description={errorMessage}
          actions={defaultActions}
        />
      </List>
    );
  }

  if (tasks.length === 0) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="No Tasks for Today"
          description="Add a task to today's note."
          actions={defaultActions}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {openTasks.length > 0 ? (
        <List.Section title="Open">
          {openTasks.map((task) => (
            <List.Item
              key={task.id}
              title={task.text}
              icon={Icon.Circle}
              actions={
                <ActionPanel>
                  <Action
                    title="Mark as Done"
                    icon={Icon.Checkmark}
                    onAction={() => handleToggleTask(task)}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                  <Action.Push
                    title="Add Task"
                    icon={Icon.Plus}
                    target={<AddTaskForm onTaskAdded={loadTasks} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadTasks}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {completedTasks.length > 0 ? (
        <List.Section title="Completed">
          {completedTasks.map((task) => (
            <List.Item
              key={task.id}
              title={task.text}
              icon={Icon.CheckCircle}
              actions={
                <ActionPanel>
                  <Action
                    title="Mark as Open"
                    icon={Icon.ArrowClockwise}
                    onAction={() => handleToggleTask(task)}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  />
                  <Action.Push
                    title="Add Task"
                    icon={Icon.Plus}
                    target={<AddTaskForm onTaskAdded={loadTasks} />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={loadTasks}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
