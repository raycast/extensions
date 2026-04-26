import {
  ActionPanel,
  Action,
  Icon,
  List,
  Color,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getTasks, getTags, scoreTask, deleteTask, HabiticaTask, HabiticaTag } from "./api";
import EditTaskForm from "./edit-task";

const PRIORITY_LABELS: Record<number, string> = {
  0.1: "Trivial",
  1: "Easy",
  1.5: "Medium",
  2: "Hard",
};

function isTaskExpired(task: HabiticaTask): boolean {
  if (task.completed || !task.date) return false;
  const dueDate = new Date(task.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate.getTime() < today.getTime();
}

function formatTaskDate(date: string | null): string | undefined {
  if (!date) return undefined;
  const taskDate = new Date(date);
  const now = new Date();
  const isCurrentYear = taskDate.getFullYear() === now.getFullYear();
  return taskDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isCurrentYear ? {} : { year: "numeric" }),
  });
}

function taskIcon(task: HabiticaTask): { source: Icon; tintColor?: Color } {
  if (task.completed) return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (isTaskExpired(task)) return { source: Icon.Circle, tintColor: Color.Red };
  return { source: Icon.Circle };
}

export default function Command() {
  const [tasks, setTasks] = useState<HabiticaTask[]>([]);
  const [tags, setTags] = useState<HabiticaTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState("all");
  const { push } = useNavigation();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [taskData, tagData] = await Promise.all([getTasks("todos"), getTags()]);
      setTasks(taskData);
      setTags(tagData);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = tagFilter === "all" ? tasks : tasks.filter((t) => t.tags.includes(tagFilter));

  async function handleScore(task: HabiticaTask) {
    const direction = task.completed ? "down" : "up";
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: direction === "up" ? "Completing…" : "Un-completing…",
      });
      await scoreTask(task.id, direction);
      await showToast({
        style: Toast.Style.Success,
        title: direction === "up" ? "Task completed!" : "Task un-completed!",
      });
      await fetchData();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to score task",
        message: String(error),
      });
    }
  }

  async function handleDelete(task: HabiticaTask) {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `Are you sure you want to delete "${task.text}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting…" });
      await deleteTask(task.id);
      await showToast({ style: Toast.Style.Success, title: "Task deleted!" });
      await fetchData();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
        message: String(error),
      });
    }
  }

  // Build a tag name lookup
  const tagNameMap = new Map(tags.map((t) => [t.id, t.name]));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Habitica To-Dos"
      searchBarPlaceholder="Search to-dos…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" onChange={setTagFilter} value={tagFilter}>
          <List.Dropdown.Item title="All Tags" value="all" />
          {tags.map((tag) => (
            <List.Dropdown.Item key={tag.id} title={tag.name} value={tag.id} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredTasks.length === 0 && !isLoading ? (
        <List.EmptyView title="No to-dos found" description="Create a new to-do to get started!" />
      ) : (
        filteredTasks.map((task) => {
          const icon = taskIcon(task);
          const formattedDate = formatTaskDate(task.date);

          // Resolve tag names for this task
          const taskTagNames = task.tags.map((tid) => tagNameMap.get(tid)).filter(Boolean) as string[];

          const difficultyLabel = PRIORITY_LABELS[task.priority] || "Unknown";

          // Build detail markdown
          const detailParts: string[] = [];
          if (task.notes) {
            detailParts.push(task.notes);
          } else {
            detailParts.push("*No description*");
          }

          return (
            <List.Item
              key={task.id}
              icon={icon}
              title={task.text}
              accessories={formattedDate ? [{ text: formattedDate }] : undefined}
              detail={
                <List.Item.Detail
                  markdown={detailParts.join("\n\n")}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Difficulty" text={difficultyLabel} />
                      <List.Item.Detail.Metadata.Separator />
                      {task.date && <List.Item.Detail.Metadata.Label title="Due Date" text={formattedDate} />}
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {taskTagNames.length > 0 ? (
                          taskTagNames.map((name) => (
                            <List.Item.Detail.Metadata.TagList.Item key={name} text={name} color={Color.Blue} />
                          ))
                        ) : (
                          <List.Item.Detail.Metadata.TagList.Item text="No tags" color={Color.SecondaryText} />
                        )}
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text={task.completed ? "Completed" : "Pending"}
                        icon={task.completed ? Icon.CheckCircle : Icon.Circle}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Task Actions">
                    <Action
                      title={task.completed ? "Uncheck Task" : "Check Task"}
                      icon={task.completed ? Icon.Circle : Icon.CheckCircle}
                      onAction={() => handleScore(task)}
                    />
                    <Action
                      title="Edit Task"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() => push(<EditTaskForm task={task} onUpdated={fetchData} />)}
                    />
                    <Action
                      title="Delete Task"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(task)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={fetchData}
                    />
                    <Action.OpenInBrowser
                      title="Open Habitica"
                      url="https://habitica.com"
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
