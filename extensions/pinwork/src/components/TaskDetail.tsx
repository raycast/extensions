/**
 * Task detail view component for Raycast.
 * Shows comprehensive information about a single task.
 */

import { Detail, ActionPanel, Action, Icon, Color } from "@raycast/api";
import type { Task } from "../api/types";
import { TaskStatusDisplay } from "../api/types";
import { completeTask, uncompleteTask, openTask } from "../api/pinwork";
import { getTaskStatusIcon, getTaskStatusColor } from "../utils/icons";
import {
  formatTaskDateTime,
  formatDeadline,
  formatEstimate,
  formatFullDate,
  isOverdue,
} from "../utils/date";

interface TaskDetailProps {
  task: Task;
  onTaskUpdated?: () => void;
}

export function TaskDetail({ task, onTaskUpdated }: TaskDetailProps) {
  // Build markdown content
  const markdown = buildMarkdown(task);

  // Build metadata
  const deadlineOverdue = task.deadline ? isOverdue(task.deadline) : false;

  async function handleComplete() {
    if (task.isCompleted) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
    onTaskUpdated?.();
  }

  async function handleOpen() {
    await openTask(task.id);
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle={task.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={TaskStatusDisplay[task.status]}
            icon={{
              source: getTaskStatusIcon(task.status),
              tintColor: getTaskStatusColor(task.status),
            }}
          />

          {task.scheduledDate && (
            <Detail.Metadata.Label
              title="Scheduled"
              text={formatTaskDateTime(
                task.scheduledDate,
                task.scheduledDateHasTime,
              )}
              icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
            />
          )}

          {task.deadline && (
            <Detail.Metadata.Label
              title="Deadline"
              text={formatDeadline(task.deadline)}
              icon={{
                source: deadlineOverdue ? Icon.ExclamationMark : Icon.Flag,
                tintColor: deadlineOverdue ? Color.Red : Color.Orange,
              }}
            />
          )}

          {task.estimate && (
            <Detail.Metadata.Label
              title="Estimate"
              text={formatEstimate(task.estimate)}
              icon={{ source: Icon.Stopwatch, tintColor: Color.SecondaryText }}
            />
          )}

          {task.projectName && (
            <Detail.Metadata.Label
              title="Project"
              text={task.projectName}
              icon={{ source: Icon.Folder, tintColor: Color.Blue }}
            />
          )}

          {task.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {task.tags.map((tag) => (
                <Detail.Metadata.TagList.Item
                  key={tag}
                  text={tag}
                  color={Color.Blue}
                />
              ))}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label
            title="Created"
            text={formatFullDate(task.createdAt)}
          />

          <Detail.Metadata.Label
            title="Modified"
            text={formatFullDate(task.modifiedAt)}
          />

          {task.isRecurring && (
            <Detail.Metadata.Label
              title="Recurring"
              text="Yes"
              icon={{ source: Icon.RotateClockwise, tintColor: Color.Blue }}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
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
          <Action.CopyToClipboard
            title="Copy Task Title"
            content={task.title}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(task: Task): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${task.title}`);
  lines.push("");

  // Notes (if any)
  if (task.notes) {
    lines.push(task.notes);
    lines.push("");
  }

  // Quick info section
  const infoParts: string[] = [];

  if (task.status !== "active") {
    infoParts.push(`**Status:** ${TaskStatusDisplay[task.status]}`);
  }

  if (task.scheduledDate) {
    infoParts.push(
      `**Scheduled:** ${formatTaskDateTime(task.scheduledDate, task.scheduledDateHasTime)}`,
    );
  }

  if (task.deadline) {
    const deadlineText = formatDeadline(task.deadline);
    infoParts.push(`**Deadline:** ${deadlineText}`);
  }

  if (task.estimate) {
    infoParts.push(`**Estimate:** ${formatEstimate(task.estimate)}`);
  }

  if (infoParts.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(infoParts.join(" • "));
  }

  return lines.join("\n");
}
