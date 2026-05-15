import {
  List,
  Action,
  ActionPanel,
  Icon,
  Color,
  Toast,
  showToast,
  Form,
  useNavigation,
} from "@raycast/api";
import { withAccessToken, useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { google } from "./oauth";
import {
  fetchTaskLists,
  fetchTasks,
  createTask,
  toggleTask,
  editTask,
  deleteTask,
} from "./api";
import { Task, TaskForm, TaskList, Filter } from "./types";

function getTaskIcon(task: Task): { source: Icon; tintColor?: Color } {
  if (task.status === "completed") {
    return { source: Icon.Checkmark, tintColor: Color.Green };
  }
  if (task.due) {
    const dueDate = new Date(task.due);
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    if (dueDate < todayUTC) {
      return { source: Icon.Circle, tintColor: Color.Red };
    }
  }
  return { source: Icon.Circle };
}

function getTaskSubtitle(task: Task): string {
  if (task.status === "completed") {
    return "Completed";
  }
  if (task.due) {
    const date = new Date(task.due);
    return `Due: ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;
  }
  return "";
}

// --- Edit Task Form ---

function EditTaskForm(props: {
  listId: string;
  task: Task;
  onEdit: (title: string, notes: string, due: Date | null) => void;
}) {
  const { pop } = useNavigation();
  const existingDue = props.task.due ? new Date(props.task.due) : null;

  const { handleSubmit, itemProps } = useForm<{
    title: string;
    notes: string;
    due: Date | null;
  }>({
    onSubmit(values) {
      props.onEdit(values.title, values.notes, values.due);
      pop();
    },
    initialValues: {
      title: props.task.title,
      notes: props.task.notes ?? "",
      due: existingDue,
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" />
      <Form.TextArea {...itemProps.notes} title="Notes" />
      <Form.DatePicker {...itemProps.due} title="Due Date" />
    </Form>
  );
}

// --- Create Task Form (inline, from within a list) ---

function InlineCreateTaskForm(props: {
  listId: string;
  onCreate: (task: TaskForm) => void;
}) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{
    title: string;
    notes: string;
    due: Date | null;
  }>({
    onSubmit(values) {
      props.onCreate({
        title: values.title,
        notes: values.notes,
        due: values.due,
      });
      pop();
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        title="Title"
        placeholder="Task title"
      />
      <Form.TextArea
        {...itemProps.notes}
        title="Notes"
        placeholder="Optional notes..."
      />
      <Form.DatePicker {...itemProps.due} title="Due Date" />
    </Form>
  );
}

// --- Task List View (shows tasks within a single list) ---

function TaskListView(props: { list: TaskList }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>(Filter.Open);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const showCompleted =
        filter === Filter.All || filter === Filter.Completed;
      const fetched = await fetchTasks(props.list.id, showCompleted);
      setTasks(fetched);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [props.list.id, filter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggle = useCallback(
    async (task: Task) => {
      try {
        await toggleTask(props.list.id, task);
        const action = task.status === "completed" ? "reopened" : "completed";
        showToast({ style: Toast.Style.Success, title: `Task ${action}` });
        await loadTasks();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to toggle task",
          message: String(error),
        });
      }
    },
    [props.list.id, loadTasks],
  );

  const handleDelete = useCallback(
    async (task: Task) => {
      try {
        await deleteTask(props.list.id, task.id);
        showToast({ style: Toast.Style.Success, title: "Task deleted" });
        await loadTasks();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete task",
          message: String(error),
        });
      }
    },
    [props.list.id, loadTasks],
  );

  const handleEdit = useCallback(
    async (task: Task, title: string, notes: string, due: Date | null) => {
      try {
        await editTask(props.list.id, task.id, { title, notes, due });
        showToast({ style: Toast.Style.Success, title: "Task updated" });
        await loadTasks();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to edit task",
          message: String(error),
        });
      }
    },
    [props.list.id, loadTasks],
  );

  const handleCreate = useCallback(
    async (task: TaskForm) => {
      try {
        await createTask(props.list.id, task);
        showToast({
          style: Toast.Style.Success,
          title: "Task created",
          message: task.title,
        });
        await loadTasks();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to create task",
          message: String(error),
        });
      }
    },
    [props.list.id, loadTasks],
  );

  const filteredTasks = tasks.filter((task) => {
    if (filter === Filter.Open) return task.status !== "completed";
    if (filter === Filter.Completed) return task.status === "completed";
    return true;
  });

  return (
    <List
      navigationTitle={props.list.title}
      isLoading={isLoading}
      searchBarPlaceholder="Filter tasks..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={filter}
          onChange={(val) => setFilter(val as Filter)}
        >
          <List.Dropdown.Item title="Open" value={Filter.Open} />
          <List.Dropdown.Item title="Completed" value={Filter.Completed} />
          <List.Dropdown.Item title="All" value={Filter.All} />
        </List.Dropdown>
      }
    >
      {filteredTasks.length === 0 ? (
        <List.EmptyView
          title={filter === Filter.Open ? "No open tasks" : "No tasks"}
          description="Press ⌘N to create a new task"
          actions={
            <ActionPanel>
              <Action
                title="Create New Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(
                    <InlineCreateTaskForm
                      listId={props.list.id}
                      onCreate={handleCreate}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredTasks.map((task) => (
          <List.Item
            key={task.id}
            title={task.title}
            subtitle={task.notes ?? ""}
            accessories={[{ text: getTaskSubtitle(task) }]}
            icon={getTaskIcon(task)}
            actions={
              <ActionPanel>
                <Action
                  title={
                    task.status === "completed"
                      ? "Reopen Task"
                      : "Complete Task"
                  }
                  icon={
                    task.status === "completed" ? Icon.Circle : Icon.Checkmark
                  }
                  onAction={() => handleToggle(task)}
                />
                <Action
                  title="Edit Task"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() =>
                    push(
                      <EditTaskForm
                        listId={props.list.id}
                        task={task}
                        onEdit={(title, notes, due) =>
                          handleEdit(task, title, notes, due)
                        }
                      />,
                    )
                  }
                />
                <Action
                  title="Create New Task"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() =>
                    push(
                      <InlineCreateTaskForm
                        listId={props.list.id}
                        onCreate={handleCreate}
                      />,
                    )
                  }
                />
                <Action
                  title="Delete Task"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(task)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// --- Main Command: shows task lists ---

function ViewTasks() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    (async () => {
      try {
        const fetched = await fetchTaskLists();
        setLists(fetched);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load task lists",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search task lists...">
      {lists.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Task Lists"
          description="Create a task list at tasks.google.com to get started"
        />
      ) : (
        lists.map((list) => (
          <List.Item
            key={list.id}
            title={list.title}
            icon={Icon.List}
            actions={
              <ActionPanel>
                <Action
                  title="View Tasks"
                  icon={Icon.ArrowRight}
                  onAction={() => push(<TaskListView list={list} />)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withAccessToken(google)(ViewTasks);
