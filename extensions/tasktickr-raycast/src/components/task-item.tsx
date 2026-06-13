import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { api } from "../lib/api";
import { refreshMenuBar } from "../lib/refresh";
import {
  formatDueDate,
  recurrenceLabel,
  resolvePostponePresets,
} from "@shared/task-core";
import type { PostponePreset, Priority, Task, Workspace } from "../lib/types";
import { TaskForm } from "./task-form";
import { SubtasksList } from "./subtasks-list";
import { AttachmentsList } from "./attachments-list";

export const PRIORITY_DISPLAY: Record<
  Priority,
  { icon: Icon; color: Color; label: string }
> = {
  HIGH: { icon: Icon.ChevronUp, color: Color.Orange, label: "High" },
  MEDIUM: { icon: Icon.Minus, color: Color.Yellow, label: "Medium" },
  LOW: { icon: Icon.ChevronDown, color: Color.Blue, label: "Low" },
};

async function withToast(
  title: string,
  fn: () => Promise<void>,
  success: string,
): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    await fn();
    toast.style = Toast.Style.Success;
    toast.title = success;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

export interface TaskItemProps {
  task: Task;
  workspaces: Workspace[];
  postponePresets: PostponePreset[] | null;
  revalidate: () => void;
  /** Reorder all open tasks by age + duration within each priority group. */
  onAutosort?: () => void;
}

export function TaskItem({
  task,
  workspaces,
  postponePresets,
  revalidate,
  onAutosort,
}: TaskItemProps) {
  const done = task.status === "DONE";
  const started = task.status === "STARTED";
  const prio = PRIORITY_DISPLAY[task.priority];
  const overdue =
    !done && task.dueDate != null && new Date(task.dueDate) < new Date();
  const workspace = workspaces.find((w) => w.id === task.workspaceId);
  const subtaskCount = task.subtasks?.length ?? 0;

  const accessories: List.Item.Accessory[] = [];
  if (subtaskCount > 0)
    accessories.push({
      icon: Icon.List,
      text: String(subtaskCount),
      tooltip: "Subtasks",
    });
  if (workspace) accessories.push({ tag: workspace.name });
  const assignees = task.assignees ?? [];
  if (assignees.length > 0) {
    accessories.push({
      icon: assignees.length > 1 ? Icon.TwoPeople : Icon.Person,
      tooltip: `Assigned to: ${assignees.map((a) => a.user.name).join(", ")}`,
    });
  }
  if (task.recurrence) {
    accessories.push({
      icon: Icon.Repeat,
      tooltip: `Repeats: ${recurrenceLabel(task.recurrence, task.recurrenceDays)}`,
    });
  }
  if (task.durationMinutes) {
    const m = task.durationMinutes;
    const text =
      m % 60 === 0
        ? `${m / 60}h`
        : m > 60
          ? `${Math.floor(m / 60)}h ${m % 60}m`
          : `${m}m`;
    accessories.push({ icon: Icon.Stopwatch, text, tooltip: "Duration" });
  }
  if (task.dueDate) {
    accessories.push({
      tag: {
        value: formatDueDate(task.dueDate),
        color: overdue ? Color.Red : Color.SecondaryText,
      },
      tooltip: "Due date",
    });
  }
  accessories.push({
    icon: { source: prio.icon, tintColor: prio.color },
    tooltip: `Priority: ${prio.label}`,
  });

  async function setStatus(action: "complete" | "start" | "reopen") {
    const labels = {
      complete: ["Completing…", "Task completed"],
      start: ["Starting…", "Task started"],
      reopen: ["Reopening…", "Task reopened"],
    } as const;
    await withToast(
      labels[action][0],
      async () => {
        await api(`/api/tasks/${task.id}/${action}`, { method: "POST" });
        revalidate();
        await refreshMenuBar();
      },
      labels[action][1],
    );
  }

  async function postponeTo(date: Date) {
    await withToast(
      "Postponing…",
      async () => {
        await api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({ dueDate: date.toISOString() }),
        });
        revalidate();
        await refreshMenuBar();
      },
      `Postponed to ${formatDueDate(date)}`,
    );
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `“${task.title}” will be permanently deleted${subtaskCount ? " together with its subtasks" : ""}.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await withToast(
      "Deleting…",
      async () => {
        await api(`/api/tasks/${task.id}`, { method: "DELETE" });
        revalidate();
        await refreshMenuBar();
      },
      "Task deleted",
    );
  }

  return (
    <List.Item
      key={task.id}
      title={task.title}
      subtitle={task.note ?? undefined}
      icon={
        done
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : started
            ? { source: Icon.CircleProgress50, tintColor: Color.Orange }
            : {
                source: Icon.Circle,
                tintColor: overdue ? Color.Red : Color.SecondaryText,
              }
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {done ? (
              <Action
                title="Reopen Task"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => setStatus("reopen")}
              />
            ) : started ? (
              <Action
                title="Complete Task"
                icon={Icon.CheckCircle}
                onAction={() => setStatus("complete")}
              />
            ) : (
              <Action
                title="Start Task"
                icon={Icon.CircleProgress50}
                onAction={() => setStatus("start")}
              />
            )}
            {!done && !started && (
              <Action
                title="Complete Task"
                icon={Icon.CheckCircle}
                onAction={() => setStatus("complete")}
              />
            )}
            {started && (
              <Action
                title="Reopen Task"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => setStatus("reopen")}
              />
            )}
            <Action.Push
              title="Edit Task"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={
                <TaskForm
                  task={task}
                  workspaces={workspaces}
                  onSaved={revalidate}
                />
              }
            />
            {!done && (
              <ActionPanel.Submenu
                title="Postpone"
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
              >
                {resolvePostponePresets(postponePresets).map((p) => (
                  <Action
                    key={p.id}
                    title={`${p.label} — ${p.title}`}
                    onAction={() => postponeTo(p.date)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Show Subtasks"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              target={
                <SubtasksList
                  parent={task}
                  workspaces={workspaces}
                  postponePresets={postponePresets}
                  onChange={revalidate}
                />
              }
            />
            <Action.Push
              title="Add Subtask"
              icon={Icon.PlusCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
              target={
                <TaskForm
                  parentId={task.id}
                  workspaces={workspaces}
                  defaultWorkspaceId={task.workspaceId ?? undefined}
                  onSaved={revalidate}
                />
              }
            />
            {(task.attachments?.length ?? 0) > 0 && (
              <Action.Push
                title="Attachments"
                icon={Icon.Paperclip}
                shortcut={{ modifiers: ["cmd"], key: "a" }}
                target={
                  <AttachmentsList
                    taskTitle={task.title}
                    attachments={task.attachments ?? []}
                  />
                }
              />
            )}
          </ActionPanel.Section>
          {onAutosort && (
            <ActionPanel.Section>
              <Action
                title="Auto-Sort Tasks"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                onAction={onAutosort}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action
              title="Delete Task"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
