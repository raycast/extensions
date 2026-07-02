import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useCallback } from "react";

import { completeTask, reopenTask } from "../api/mutations";
import type { ProjectRecord, TaskRecord } from "../api/types";
import { formatDate, getTaskState } from "../helpers/task-helpers";
import { useChecklistItems } from "../hooks/use-checklist-items";

interface TaskDetailProps {
  task: TaskRecord;
  projects: ProjectRecord[];
  revalidate: () => void;
}

export default function TaskDetail({ task, projects, revalidate }: TaskDetailProps) {
  const { checklistItems } = useChecklistItems(task.id);
  const state = getTaskState(task);
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined;

  let markdown = `# ${task.title}\n\n`;

  if (task.description) {
    markdown += `${task.description}\n\n`;
  }

  if (checklistItems.length > 0) {
    markdown += "## Checklist\n\n";
    for (const item of checklistItems) {
      const check = item.completedAt ? "x" : " ";
      markdown += `- [${check}] ${item.title}\n`;
    }
  }

  const handleComplete = useCallback(async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Completing task...",
      });
      await completeTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task completed",
      });
      revalidate();
    } catch (error) {
      await showToast({
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
        title: "Failed to complete task",
      });
    }
  }, [task.id, revalidate]);

  const handleReopen = useCallback(async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Reopening task...",
      });
      await reopenTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task reopened",
      });
      revalidate();
    } catch (error) {
      await showToast({
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
        title: "Failed to reopen task",
      });
    }
  }, [task.id, revalidate]);

  return (
    <Detail
      actions={
        <ActionPanel>
          {state === "open" && (
            <Action
              icon={Icon.CheckCircle}
              onAction={handleComplete}
              shortcut={{ key: "d", modifiers: ["cmd"] }}
              title="Mark as Completed"
            />
          )}
          {state === "done" && (
            <Action
              icon={Icon.ArrowCounterClockwise}
              onAction={handleReopen}
              shortcut={{ key: "d", modifiers: ["cmd"] }}
              title="Reopen Task"
            />
          )}
          <Action.CopyToClipboard content={task.title} title="Copy Title" />
          <Action.CopyToClipboard content={task.id} title="Copy ID" />
        </ActionPanel>
      }
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label text={state} title="Status" />
          {project && <Detail.Metadata.Label text={project.name} title="Project" />}
          {task.deadlineAt && <Detail.Metadata.Label text={formatDate(task.deadlineAt)} title="Deadline" />}
          {task.startDate && <Detail.Metadata.Label text={formatDate(task.startDate)} title="Start Date" />}
          <Detail.Metadata.Label text={formatDate(task.createdAt)} title="Created" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label text={task.id} title="ID" />
        </Detail.Metadata>
      }
    />
  );
}
