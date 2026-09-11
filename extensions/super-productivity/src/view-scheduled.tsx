import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color, Alert, confirmAlert } from "@raycast/api";
import { getTasks, getProjects, getTags, startTask, archiveTask, deleteTask, updateTask } from "./api";
import type { Task, Project, Tag } from "./types";
import { formatLocalDate, getProjectTitle, getTagTitles, getTodayStr } from "./utils";

type TimeBucket = "overdue" | "today" | "tomorrow" | "thisWeek" | "later" | "undated";

interface TaskGroup {
  bucket: TimeBucket;
  label: string;
  tasks: Task[];
}

function getTomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

function getEndOfWeekStr(): string {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const daysUntilEnd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilEnd);
  return formatLocalDate(d);
}

function getBucket(dueDay: string): TimeBucket {
  const today = getTodayStr();
  const tomorrow = getTomorrowStr();
  const endOfWeek = getEndOfWeekStr();

  if (dueDay < today) return "overdue";
  if (dueDay === today) return "today";
  if (dueDay === tomorrow) return "tomorrow";
  if (dueDay <= endOfWeek) return "thisWeek";
  return "later";
}

function formatDueDay(dueDay: string): string {
  const today = getTodayStr();
  const tomorrow = getTomorrowStr();

  if (dueDay === today) return "Today";
  if (dueDay === tomorrow) return "Tomorrow";

  const d = new Date(dueDay + "T00:00:00");
  const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${dayName}, ${monthDay}`;
}

const BUCKET_CONFIG: { bucket: TimeBucket; label: string; icon: Icon }[] = [
  { bucket: "overdue", label: "Overdue", icon: Icon.ExclamationMark },
  { bucket: "today", label: "Today", icon: Icon.Calendar },
  { bucket: "tomorrow", label: "Tomorrow", icon: Icon.Calendar },
  { bucket: "thisWeek", label: "This Week", icon: Icon.Calendar },
  { bucket: "later", label: "Later", icon: Icon.Calendar },
  { bucket: "undated", label: "No Due Date", icon: Icon.QuestionMark },
];

export default function Command() {
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUndated, setShowUndated] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function fetchScheduledTasks() {
    setIsLoading(true);
    setHasError(false);
    try {
      const [fetchedTasks, fetchedProjects, fetchedTags] = await Promise.all([
        getTasks({ source: "active" }),
        getProjects(),
        getTags(),
      ]);
      setProjects(fetchedProjects);
      setTags(fetchedTags);

      const groups: TaskGroup[] = [];

      for (const cfg of BUCKET_CONFIG) {
        const bucketTasks = fetchedTasks.filter((task) => {
          if (!task.dueDay) return cfg.bucket === "undated";
          return getBucket(task.dueDay) === cfg.bucket;
        });

        if (bucketTasks.length > 0) {
          bucketTasks.sort((a, b) => (a.dueDay || "").localeCompare(b.dueDay || ""));
          groups.push({
            bucket: cfg.bucket,
            label: cfg.label,
            tasks: bucketTasks,
          });
        }
      }

      setTaskGroups(groups);
    } catch (e) {
      console.error("Failed to fetch scheduled tasks:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchScheduledTasks();
  }, []);

  async function handleStartTask(taskId: string) {
    try {
      await startTask(taskId);
      fetchScheduledTasks();
    } catch (e) {
      console.error("Failed to start task:", e);
    }
  }

  async function handleCompleteTask(task: Task) {
    try {
      await updateTask(task.id, { isDone: true });
      fetchScheduledTasks();
    } catch (e) {
      console.error("Failed to complete task:", e);
    }
  }

  async function handleArchiveTask(task: Task) {
    if (
      await confirmAlert({
        title: "Archive Task",
        message: `Archive "${task.title}"?`,
        primaryAction: { title: "Archive" },
      })
    ) {
      try {
        await archiveTask(task.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Task archived",
        });
        fetchScheduledTasks();
      } catch (e) {
        console.error("Failed to archive task:", e);
      }
    }
  }

  async function handleDeleteTask(task: Task) {
    if (
      await confirmAlert({
        title: "Delete Task",
        message: `Permanently delete "${task.title}"?`,
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteTask(task.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Task deleted",
        });
        fetchScheduledTasks();
      } catch (e) {
        console.error("Failed to delete task:", e);
      }
    }
  }

  if (hasError) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load scheduled tasks"
          description="Make sure Super Productivity is running and its Local REST API is enabled."
        />
      </List>
    );
  }

  const visibleGroups = showUndated ? taskGroups : taskGroups.filter((g) => g.bucket !== "undated");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search scheduled tasks..."
      searchBarAccessory={
        <List.Dropdown tooltip="Show/hide undated tasks" onChange={(value) => setShowUndated(value === "yes")}>
          <List.Dropdown.Item title="Scheduled only" value="no" />
          <List.Dropdown.Item title="Include undated" value="yes" />
        </List.Dropdown>
      }
    >
      {visibleGroups.map((group) => (
        <List.Section key={group.bucket} title={group.label}>
          {group.tasks.map((task) => {
            const tagStr = getTagTitles(task.tagIds, tags);
            const projectTitle = getProjectTitle(task.projectId, projects);
            const timeEstimate = task.timeEstimate > 0 ? `${task.timeEstimate / 3600000}h` : "";
            const dueLabel = task.dueDay ? formatDueDay(task.dueDay) : "";

            return (
              <List.Item
                key={task.id}
                title={task.title}
                subtitle={projectTitle}
                keywords={[task.title, projectTitle, tagStr, dueLabel, group.label]}
                accessories={[
                  ...(task.dueDay ? [{ text: dueLabel, icon: Icon.Calendar }] : []),
                  ...(tagStr ? [{ text: tagStr, icon: Icon.Tag }] : []),
                  ...(timeEstimate ? [{ text: timeEstimate, icon: Icon.Clock }] : []),
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title={
                          task.timeSpent > 0
                            ? `Resume Tracking (${(task.timeSpent / 3600000).toFixed(1)}h spent)`
                            : "Start Tracking"
                        }
                        icon={task.timeSpent > 0 ? Icon.ArrowClockwise : Icon.Play}
                        onAction={() => handleStartTask(task.id)}
                      />
                      <Action
                        title="Mark Complete"
                        icon={Icon.CheckCircle}
                        onAction={() => handleCompleteTask(task)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action
                        title="Archive"
                        icon={Icon.Tray}
                        onAction={() => handleArchiveTask(task)}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Delete"
                        icon={{
                          source: Icon.Trash,
                          tintColor: Color.Red,
                        }}
                        style={Action.Style.Destructive}
                        onAction={() => handleDeleteTask(task)}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={fetchScheduledTasks}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {!isLoading && visibleGroups.length === 0 && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No scheduled tasks"
          description="Set due dates on tasks in Super Productivity to see them here, or toggle 'Include undated' to see tasks without a due date."
        />
      )}
    </List>
  );
}
