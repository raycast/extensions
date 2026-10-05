/**
 * Reusable task list item component for Raycast lists.
 */

import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import type { Task } from "../api/types";
import { DeferTargetDisplay, type DeferTarget } from "../api/types";
import { TaskDetail } from "./TaskDetail";
import {
  completeTask,
  uncompleteTask,
  deferTask,
  archiveTask,
  deleteTask,
  openTask,
} from "../api/pinwork";
import {
  getTaskStatusIcon,
  getTaskStatusColor,
  getDeadlineIcon,
  getDeadlineColor,
  getRecurringIcon,
  getEstimateIcon,
  getProjectIcon,
} from "../utils/icons";
import {
  formatTaskDate,
  formatDeadline,
  isOverdue,
  formatEstimate,
} from "../utils/date";

interface TaskListItemProps {
  task: Task;
  onTaskUpdated?: () => void;
  mutateTasks?: MutatePromise<Task[]>;
}

export function TaskListItem({
  task,
  onTaskUpdated,
  mutateTasks,
}: TaskListItemProps) {
  // Build accessories (metadata shown on the right)
  const accessories: List.Item.Accessory[] = [];

  // Deadline (if present)
  if (task.deadline) {
    const overdue = isOverdue(task.deadline);
    accessories.push({
      icon: {
        source: getDeadlineIcon(overdue),
        tintColor: getDeadlineColor(overdue),
      },
      text: formatDeadline(task.deadline),
      tooltip: "Deadline",
    });
  }

  // Scheduled date (if not today view context)
  if (task.scheduledDate) {
    accessories.push({
      text: formatTaskDate(task.scheduledDate),
      tooltip: "Scheduled",
    });
  }

  // Estimate
  if (task.estimate) {
    accessories.push({
      icon: { source: getEstimateIcon(), tintColor: Color.SecondaryText },
      text: formatEstimate(task.estimate),
      tooltip: "Estimate",
    });
  }

  // Recurring indicator
  if (task.isRecurring) {
    accessories.push({
      icon: { source: getRecurringIcon(), tintColor: Color.Blue },
      tooltip: "Recurring",
    });
  }

  // Project
  if (task.projectName) {
    accessories.push({
      icon: { source: getProjectIcon(), tintColor: Color.SecondaryText },
      text: task.projectName,
      tooltip: "Project",
    });
  }

  // Tags (show first tag if any)
  if (task.tags.length > 0) {
    const tagText =
      task.tags.length > 1
        ? `${task.tags[0]} +${task.tags.length - 1}`
        : task.tags[0];
    accessories.push({
      icon: { source: Icon.Tag, tintColor: Color.SecondaryText },
      text: tagText,
      tooltip: `Tags: ${task.tags.join(", ")}`,
    });
  }

  // Action handlers
  async function handleComplete() {
    const updatePromise = task.isCompleted
      ? uncompleteTask(task.id)
      : completeTask(task.id);

    if (mutateTasks) {
      await mutateTasks(updatePromise, {
        optimisticUpdate: (data) =>
          data.map((item) =>
            item.id === task.id
              ? { ...item, isCompleted: !task.isCompleted }
              : item,
          ),
        rollbackOnError: true,
      });
      return;
    }

    await updatePromise;
    onTaskUpdated?.();
  }

  async function handleDefer(target: DeferTarget) {
    await deferTask(task.id, target);
    onTaskUpdated?.();
  }

  async function handleArchive() {
    const updatePromise = archiveTask(task.id);

    if (mutateTasks) {
      await mutateTasks(updatePromise, {
        optimisticUpdate: (data) => data.filter((item) => item.id !== task.id),
        rollbackOnError: true,
      });
      return;
    }

    await updatePromise;
    onTaskUpdated?.();
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `Are you sure you want to delete "${task.title}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const updatePromise = deleteTask(task.id);

      if (mutateTasks) {
        await mutateTasks(updatePromise, {
          optimisticUpdate: (data) =>
            data.filter((item) => item.id !== task.id),
          rollbackOnError: true,
        });
        return;
      }

      await updatePromise;
      onTaskUpdated?.();
    }
  }

  async function handleOpen() {
    await openTask(task.id);
  }

  return (
    <List.Item
      id={task.id}
      title={task.title}
      subtitle={task.notes?.split("\n")[0]} // First line of notes
      icon={{
        source: getTaskStatusIcon(task.status),
        tintColor: getTaskStatusColor(task.status),
      }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Task Actions">
            <Action.Push
              title="Show Details"
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={<TaskDetail task={task} onTaskUpdated={onTaskUpdated} />}
            />
            <Action
              title={task.isCompleted ? "Mark Incomplete" : "Complete"}
              icon={task.isCompleted ? Icon.Circle : Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={handleComplete}
            />
            <Action
              title="Open in Pinwork"
              icon={Icon.ArrowNe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={handleOpen}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Defer">
            {(
              Object.entries(DeferTargetDisplay) as [DeferTarget, string][]
            ).map(([target, label]) => (
              <Action
                key={target}
                title={`Defer to ${label}`}
                icon={Icon.Calendar}
                onAction={() => handleDefer(target)}
              />
            ))}
          </ActionPanel.Section>

          <ActionPanel.Section title="Organize">
            <Action
              title="Archive"
              icon={Icon.Tray}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={handleArchive}
            />
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={handleDelete}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Task Title"
              content={task.title}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {task.notes && (
              <Action.CopyToClipboard
                title="Copy Task Notes"
                content={task.notes}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
