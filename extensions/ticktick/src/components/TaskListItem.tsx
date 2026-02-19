import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Alert,
  confirmAlert,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { completeTask, deleteTask, updateTask } from "../api";
import { PRIORITY_COLORS, PRIORITY_ICONS, PRIORITY_LABELS } from "../constants";
import { Project, Task } from "../types";
import { TaskDetail } from "./TaskDetail";
import { TaskForm } from "./TaskForm";

interface TaskListItemProps {
  task: Task;
  projects: Project[];
  onRefresh: () => void;
}

// Returns a human-readable label AND flags for colour decisions — avoids
// running two separate date comparisons in the render path.
function getDueDateInfo(
  dateStr?: string,
): { label: string; overdue: boolean; isToday: boolean } | undefined {
  if (!dateStr) return undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const taskDate = new Date(dateStr);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate < today)
    return { label: "Overdue", overdue: true, isToday: false };
  if (taskDate.getTime() === today.getTime())
    return { label: "Today", overdue: false, isToday: true };
  if (taskDate.getTime() === tomorrow.getTime())
    return { label: "Tomorrow", overdue: false, isToday: false };

  const diffDays = Math.round(
    (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays <= 7) {
    return {
      label: `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`,
      overdue: false,
      isToday: false,
    };
  }

  return {
    label: new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    overdue: false,
    isToday: false,
  };
}

function getDueDateColor(info: { overdue: boolean; isToday: boolean }): Color {
  if (info.overdue) return Color.Red;
  if (info.isToday) return Color.Orange;
  return Color.SecondaryText;
}

// Builds a checklist progress string e.g. "2/5" — shown only when sub-items exist.
function getChecklistSummary(task: Task): string | undefined {
  if (!task.items || task.items.length === 0) return undefined;
  const done = task.items.filter((i) => i.status === 2).length;
  return `${done}/${task.items.length}`;
}

export function TaskListItem({ task, projects, onRefresh }: TaskListItemProps) {
  const project = projects.find((p) => p.id === task.projectId);
  const dueDateInfo = getDueDateInfo(task.dueDate);
  const checklistSummary = getChecklistSummary(task);

  // Accessory order: tags → checklist progress → due date → project name.
  // Due date sits near the right edge where the eye lands first on a list row.
  // Project (stable ambient context) stays at the far right as plain text.
  const accessories: List.Item.Accessory[] = [];

  if (task.tags && task.tags.length > 0) {
    task.tags.slice(0, 2).forEach((tag) => {
      accessories.push({ tag: { value: tag, color: Color.Purple } });
    });
    if (task.tags.length > 2) {
      accessories.push({
        tag: { value: `+${task.tags.length - 2}`, color: Color.SecondaryText },
        tooltip: `Also: ${task.tags.slice(2).join(", ")}`,
      });
    }
  }

  if (checklistSummary) {
    accessories.push({
      icon: { source: Icon.BulletPoints, tintColor: Color.SecondaryText },
      text: { value: checklistSummary, color: Color.SecondaryText },
      tooltip: "Checklist progress",
    });
  }

  if (dueDateInfo) {
    accessories.push({
      tag: {
        value: dueDateInfo.label,
        color: getDueDateColor(dueDateInfo),
      },
      tooltip: task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
        : undefined,
    });
  }

  if (project) {
    accessories.push({
      icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
      text: { value: project.name, color: Color.SecondaryText },
    });
  }

  // Only show subtitle when notes are non-empty — keeps rows clean.
  const subtitle = task.content?.trim() || undefined;

  return (
    <List.Item
      title={task.title}
      subtitle={subtitle}
      icon={{
        source: PRIORITY_ICONS[task.priority] ?? Icon.Circle,
        tintColor: PRIORITY_COLORS[task.priority],
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          {/* Edit is the primary action on Enter — navigating to edit is the
              most common intent when pressing Enter on a task. Completing a
              task is intentional and distinct, so it has its own shortcut to avoid
              accidental completions. */}
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={
              <TaskDetail
                task={task}
                projects={projects}
                onRefresh={onRefresh}
              />
            }
          />
          <Action.Push
            title="Edit Task"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={
              <TaskForm task={task} projects={projects} onSubmit={onRefresh} />
            }
          />

          <ActionPanel.Section title="Task">
            <Action
              title="Complete Task"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                try {
                  await completeTask(task.projectId, task.id);
                  await showHUD(`Completed: ${task.title}`);
                  onRefresh();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to complete task",
                    message: String(error),
                  });
                }
              }}
            />
            <Action
              title="Cycle Priority"
              icon={Icon.Signal3}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={async () => {
                const order = [0, 1, 3, 5];
                const next =
                  order[(order.indexOf(task.priority) + 1) % order.length];
                try {
                  await updateTask(task.id, {
                    projectId: task.projectId,
                    priority: next,
                  });
                  await showHUD(`Priority: ${PRIORITY_LABELS[next]}`);
                  onRefresh();
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to update priority",
                    message: String(error),
                  });
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Organise">
            <ActionPanel.Submenu
              title="Move to Project"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            >
              <Action
                title="Inbox"
                icon={Icon.Tray}
                onAction={async () => {
                  try {
                    await updateTask(task.id, {
                      projectId: "",
                    });
                    await showHUD(`Moved to Inbox`);
                    onRefresh();
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to move task",
                      message: String(err),
                    });
                  }
                }}
              />
              {projects
                .filter((p) => p.id !== task.projectId)
                .map((p) => (
                  <Action
                    key={p.id}
                    title={p.name}
                    icon={{
                      source: Icon.Folder,
                      tintColor: p.color ?? Color.SecondaryText,
                    }}
                    onAction={async () => {
                      try {
                        await updateTask(task.id, {
                          projectId: p.id,
                        });
                        await showHUD(`Moved to ${p.name}`);
                        onRefresh();
                      } catch (err) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to move task",
                          message: String(err),
                        });
                      }
                    }}
                  />
                ))}
            </ActionPanel.Submenu>
            <Action.Push
              title="New Task"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<TaskForm projects={projects} onSubmit={onRefresh} />}
            />
          </ActionPanel.Section>

          {/* Copy & open section */}
          <ActionPanel.Section title="Copy & Open">
            <Action.OpenInBrowser
              title="Open in Ticktick"
              icon={Icon.Globe}
              url={`https://ticktick.com/webapp/#q/all/tasks/${task.id}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            <Action
              title="Copy Title"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() => Clipboard.copy(task.title)}
            />
            {task.content ? (
              <Action
                title="Copy Notes"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                onAction={() => Clipboard.copy(task.content ?? "")}
              />
            ) : null}
          </ActionPanel.Section>

          {/* Destructive last */}
          <ActionPanel.Section>
            <Action
              title="Delete Task"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Delete Task",
                    message: `Are you sure you want to delete "${task.title}"?`,
                    primaryAction: {
                      title: "Delete",
                      style: Alert.ActionStyle.Destructive,
                    },
                  })
                ) {
                  try {
                    await deleteTask(task.projectId, task.id);
                    await showHUD(`Deleted: ${task.title}`);
                    onRefresh();
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to delete task",
                      message: String(error),
                    });
                  }
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
