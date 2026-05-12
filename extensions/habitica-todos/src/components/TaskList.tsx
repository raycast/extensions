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
import { getTasks, getTags, scoreTask, deleteTask } from "../api";
import { HabiticaTask, HabiticaTag } from "../types";
import { PRIORITY_LABELS, TAG_FILTER_ALL } from "../constants";
import EditTaskForm from "../edit-task";

interface TaskListProps {
  type: "todos" | "dailys" | "habits" | "rewards";
  navigationTitle: string;
}

function isTaskExpired(task: HabiticaTask): boolean {
  if (task.completed || !task.date) return false;
  const dueDate = new Date(task.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate.getTime() < today.getTime();
}

function formatTaskDate(date: string | null | undefined): string | undefined {
  if (!date) return undefined;
  const taskDate = new Date(date);
  if (Number.isNaN(taskDate.getTime())) return undefined;
  const now = new Date();
  const isCurrentYear = taskDate.getFullYear() === now.getFullYear();
  return taskDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isCurrentYear ? {} : { year: "numeric" }),
  });
}

function taskIcon(task: HabiticaTask): { source: Icon; tintColor?: Color } {
  if (task.type === "habit") {
    if (task.value >= 50) return { source: Icon.Stars, tintColor: Color.Blue };
    if (task.value >= 10) return { source: Icon.Plus, tintColor: Color.Green };
    if (task.value < -10) return { source: Icon.Minus, tintColor: Color.Red };
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }

  if (task.completed) return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (isTaskExpired(task)) return { source: Icon.Circle, tintColor: Color.Red };
  return { source: Icon.Circle };
}

export default function TaskList({ type, navigationTitle }: TaskListProps) {
  const [tasks, setTasks] = useState<HabiticaTask[]>([]);
  const [tags, setTags] = useState<HabiticaTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tagFilter, setTagFilter] = useState(TAG_FILTER_ALL);
  const { push } = useNavigation();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [taskData, tagData] = await Promise.all([getTasks(type), getTags()]);
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
  }, [type]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTasks = tagFilter === TAG_FILTER_ALL ? tasks : tasks.filter((t) => t.tags.includes(tagFilter));

  async function handleScore(task: HabiticaTask, direction: "up" | "down" = "up") {
    let actionName = "Completing";
    let successName = "Task completed!";

    if (task.type === "habit") {
      actionName = direction === "up" ? "Scoring +" : "Scoring -";
      successName = direction === "up" ? "Scored +" : "Scored -";
    } else if (task.type === "reward") {
      actionName = "Purchasing";
      successName = "Reward purchased!";
    } else if (task.completed) {
      actionName = "Un-completing";
      successName = "Task un-completed!";
      direction = "down";
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: `${actionName}…` });
      await scoreTask(task.id, direction);
      await showToast({ style: Toast.Style.Success, title: successName });
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

  const tagNameMap = new Map(tags.map((t) => [t.id, t.name]));

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search tasks…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" onChange={setTagFilter} value={tagFilter}>
          <List.Dropdown.Item title="All Tags" value={TAG_FILTER_ALL} />
          {tags.map((tag) => (
            <List.Dropdown.Item key={tag.id} title={tag.name} value={tag.id} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredTasks.length === 0 && !isLoading ? (
        <List.EmptyView title="No tasks found" description="Create a new one to get started!" />
      ) : (
        filteredTasks.map((task) => {
          const icon = taskIcon(task);
          const formattedDate = formatTaskDate(task.date);
          const taskTagNames = task.tags.map((tid) => tagNameMap.get(tid)).filter(Boolean) as string[];
          const difficultyLabel = PRIORITY_LABELS[task.priority] ?? "Unknown";

          const detailMarkdown = task.notes || "*No description*";

          return (
            <List.Item
              key={task.id}
              icon={icon}
              title={task.text}
              accessories={formattedDate ? [{ text: formattedDate }] : undefined}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Difficulty" text={difficultyLabel} />
                      {task.type === "habit" && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Positives (+)" text={String(task.counterUp ?? 0)} />
                          <List.Item.Detail.Metadata.Label title="Negatives (-)" text={String(task.counterDown ?? 0)} />
                        </>
                      )}
                      {task.type === "daily" && task.streak !== undefined && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Streak" text={String(task.streak)} />
                        </>
                      )}
                      {formattedDate && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Due Date" text={formattedDate} />
                        </>
                      )}
                      <List.Item.Detail.Metadata.Separator />
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
                    {task.type === "habit" ? (
                      <>
                        {task.up !== false && (
                          <Action title="Score +" icon={Icon.Plus} onAction={() => handleScore(task, "up")} />
                        )}
                        {task.down !== false && (
                          <Action
                            title="Score -"
                            icon={Icon.Minus}
                            shortcut={{ modifiers: ["cmd"], key: "d" }}
                            onAction={() => handleScore(task, "down")}
                          />
                        )}
                        {task.up === false && task.down === false && (
                          <Action title="Score" icon={Icon.Plus} onAction={() => handleScore(task, "up")} />
                        )}
                      </>
                    ) : task.type === "reward" ? (
                      <Action title="Purchase Reward" icon={Icon.Cart} onAction={() => handleScore(task)} />
                    ) : (
                      <Action
                        title={task.completed ? "Uncheck Task" : "Check Task"}
                        icon={task.completed ? Icon.Circle : Icon.CheckCircle}
                        onAction={() => handleScore(task)}
                      />
                    )}
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
