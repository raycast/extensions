import { List, ActionPanel, Action, showToast, Toast, Form, Icon, Color, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAllTasks, updateTask } from "./notionClient";
import { NotionTask, TaskStatus, TaskPriority, TaskProgress, PRIORITY_ICONS, STATUS_ICONS } from "./types";
import { format, parseISO } from "date-fns";

const STATUS_OPTIONS: TaskStatus[] = ["Backlog", "To-do", "Blocked", "In progress", "Done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["Critical", "High", "Medium", "Low"];
const PROGRESS_OPTIONS: TaskProgress[] = ["0%", "25%", "50%", "75%", "100%"];

function TaskList() {
  const [tasks, setTasks] = useState<NotionTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const fetchedTasks = await getAllTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        primaryAction:
          error instanceof Error && error.message.includes("Unauthorized")
            ? {
                title: "Open Settings",
                onAction: async () => {
                  await openExtensionPreferences();
                },
              }
            : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const searchLower = searchText.toLowerCase();
    return (
      task.Name.toLowerCase().includes(searchLower) ||
      task.Status.toLowerCase().includes(searchLower) ||
      task.Project?.toLowerCase().includes(searchLower)
    );
  });

  function getAccessories(task: NotionTask) {
    const accessories: List.Item.Accessory[] = [];

    if (task.Priority) {
      accessories.push({
        text: `${PRIORITY_ICONS[task.Priority]} ${task.Priority}`,
        tooltip: `Priority: ${task.Priority}`,
      });
    }

    if (task.Progress) {
      accessories.push({
        text: task.Progress,
        tooltip: `Progress: ${task.Progress}`,
      });
    }

    if (task["Due Date"]) {
      accessories.push({
        date: parseISO(task["Due Date"]),
        tooltip: `Due: ${format(parseISO(task["Due Date"]), "MMM dd, yyyy")}`,
      });
    }

    if (task["Estimated Time"]) {
      accessories.push({
        text: `⏱ ${task["Estimated Time"]}`,
        tooltip: `Estimated: ${task["Estimated Time"]}`,
      });
    }

    return accessories;
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search tasks...">
      {filteredTasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.Name}
          subtitle={task.Project || undefined}
          icon={{ source: Icon.Circle, tintColor: getStatusColor(task.Status) }}
          accessories={getAccessories(task)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Update Task"
                icon={Icon.Pencil}
                target={<UpdateTaskForm task={task} onUpdate={loadTasks} />}
              />
              <Action.OpenInBrowser title="Open in Notion" url={task.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
              <Action
                title="Mark as Done"
                icon={Icon.Check}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={async () => {
                  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating task..." });
                  try {
                    await updateTask(task.id, { status: "Done", progress: "100%" });
                    toast.style = Toast.Style.Success;
                    toast.title = `✓ ${task.Name} → Done`;
                    await loadTasks();
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to update task";
                    toast.message = error instanceof Error ? error.message : "Unknown error";
                  }
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadTasks}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UpdateTaskForm({ task, onUpdate }: { task: NotionTask; onUpdate: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: {
    status?: TaskStatus;
    priority?: TaskPriority;
    progress?: TaskProgress;
    dueDate?: Date;
    planned?: Date;
  }) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating task...",
    });

    try {
      await updateTask(task.id, values);
      toast.style = Toast.Style.Success;
      toast.title = `✓ ${task.Name} updated`;
      await onUpdate();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update task";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Task" onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Open in Notion" url={task.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        </ActionPanel>
      }
    >
      <Form.Description title="Task" text={task.Name} />

      <Form.Dropdown id="status" title="Status" defaultValue={task.Status}>
        {STATUS_OPTIONS.map((status) => (
          <Form.Dropdown.Item key={status} value={status} title={`${STATUS_ICONS[status]} ${status}`} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="priority" title="Priority" defaultValue={task.Priority || ""}>
        <Form.Dropdown.Item value="" title="None" />
        {PRIORITY_OPTIONS.map((priority) => (
          <Form.Dropdown.Item key={priority} value={priority} title={`${PRIORITY_ICONS[priority]} ${priority}`} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="progress" title="Progress" defaultValue={task.Progress || ""}>
        <Form.Dropdown.Item value="" title="None" />
        {PROGRESS_OPTIONS.map((progress) => (
          <Form.Dropdown.Item key={progress} value={progress} title={progress} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={task["Due Date"] ? parseISO(task["Due Date"]) : undefined}
      />

      <Form.DatePicker
        id="planned"
        title="Planned Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={task.Planned ? parseISO(task.Planned) : undefined}
      />
    </Form>
  );
}

function getStatusColor(status: TaskStatus): Color {
  switch (status) {
    case "Done":
      return Color.Green;
    case "In progress":
      return Color.Blue;
    case "Blocked":
      return Color.Red;
    case "To-do":
      return Color.Yellow;
    case "Backlog":
      return Color.SecondaryText;
    default:
      return Color.PrimaryText;
  }
}

export default function Command() {
  return <TaskList />;
}
