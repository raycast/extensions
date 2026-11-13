import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useCallback, useState } from "react";

import { completeTask, reopenTask } from "../api/mutations";
import type { ProjectRecord, TaskRecord } from "../api/types";
import { revalidateAfterMutation } from "../helpers/revalidate";
import { formatDate, getTaskState } from "../helpers/task-helpers";
import { useChecklistItems } from "../hooks/use-checklist-items";

interface TaskDetailProps {
  task: TaskRecord;
  projects: ProjectRecord[];
  revalidate: () => void;
}

export default function TaskDetail({ task, projects, revalidate }: TaskDetailProps) {
  const [currentTask, setCurrentTask] = useState(task);
  const { checklistItems } = useChecklistItems(task.id);
  const state = getTaskState(currentTask);
  const project = currentTask.projectId ? projects.find((p) => p.id === currentTask.projectId) : undefined;

  let markdown = `# ${currentTask.title}\n\n`;

  if (currentTask.description) {
    markdown += `${currentTask.description}\n\n`;
  }

  if (checklistItems.length > 0) {
    markdown += "## Checklist\n\n";
    for (const item of checklistItems) {
      const check = item.completedAt ? "x" : " ";
      markdown += `- [${check}] ${item.title}\n`;
    }
  }

  const handleComplete = useCallback(async () => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Completing task...",
    });
    try {
      await completeTask(task.id);
    } catch {
      await showToast({
        message: "Check your connection and try again.",
        style: Toast.Style.Failure,
        title: "Couldn't complete task",
      });
      return;
    }

    setCurrentTask((value) => ({ ...value, completedAt: new Date().toISOString() }));
    await showToast({
      style: Toast.Style.Success,
      title: "Task completed",
    });
    await revalidateAfterMutation(revalidate);
  }, [task.id, revalidate]);

  const handleReopen = useCallback(async () => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Reopening task...",
    });
    try {
      await reopenTask(task.id);
    } catch {
      await showToast({
        message: "Check your connection and try again.",
        style: Toast.Style.Failure,
        title: "Couldn't reopen task",
      });
      return;
    }

    setCurrentTask((value) => ({ ...value, completedAt: null }));
    await showToast({
      style: Toast.Style.Success,
      title: "Task reopened",
    });
    await revalidateAfterMutation(revalidate);
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
              title="Complete Task"
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
          <Action.CopyToClipboard content={currentTask.title} title="Copy Title" />
          <Action.CopyToClipboard content={currentTask.id} title="Copy ID" />
        </ActionPanel>
      }
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label text={state} title="Status" />
          {project && <Detail.Metadata.Label text={project.name} title="Project" />}
          {currentTask.deadlineAt && (
            <Detail.Metadata.Label text={formatDate(currentTask.deadlineAt)} title="Deadline" />
          )}
          {currentTask.startDate && (
            <Detail.Metadata.Label text={formatDate(currentTask.startDate)} title="Start Date" />
          )}
          <Detail.Metadata.Label text={formatDate(currentTask.createdAt)} title="Created" />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label text={currentTask.id} title="ID" />
        </Detail.Metadata>
      }
    />
  );
}
