import { Action, ActionPanel, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback } from "react";

import { archiveTask, completeTask, reopenTask, unarchiveTask } from "../api/mutations";
import type { ProjectRecord, TaskRecord, WorkspaceSummary } from "../api/types";
import { getTaskState } from "../helpers/task-helpers";
import TaskDetail from "./task-detail";

interface TaskActionsProps {
  task: TaskRecord;
  projects: ProjectRecord[];
  revalidate: () => void;
  workspaces?: WorkspaceSummary[];
}

const withErrorToast = async (action: string, fn: () => Promise<void>, revalidate: () => void) => {
  try {
    await showToast({ style: Toast.Style.Animated, title: `${action}...` });
    await fn();
    await showToast({ style: Toast.Style.Success, title: action });
    revalidate();
  } catch (error) {
    await showToast({
      message: error instanceof Error ? error.message : "Unknown error",
      style: Toast.Style.Failure,
      title: `Failed: ${action}`,
    });
  }
};

export const TaskActions = ({ task, projects, revalidate, workspaces }: TaskActionsProps) => {
  const { push } = useNavigation();
  const state = getTaskState(task);
  const workspace = workspaces?.find((w) => w.id === task.workspaceId);
  const taskUrl = workspace?.urlKey ? `https://donebear.com/${workspace.urlKey}/task/${task.id}` : null;

  const handleShowDetail = useCallback(() => {
    push(<TaskDetail projects={projects} revalidate={revalidate} task={task} />);
  }, [push, projects, revalidate, task]);

  const handleComplete = useCallback(
    () => withErrorToast("Task completed", () => completeTask(task.id), revalidate),
    [task.id, revalidate],
  );

  const handleReopen = useCallback(
    () => withErrorToast("Task reopened", () => reopenTask(task.id), revalidate),
    [task.id, revalidate],
  );

  const handleArchive = useCallback(
    () => withErrorToast("Task archived", () => archiveTask(task.id), revalidate),
    [task.id, revalidate],
  );

  const handleUnarchive = useCallback(
    () => withErrorToast("Task unarchived", () => unarchiveTask(task.id), revalidate),
    [task.id, revalidate],
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action icon={Icon.Eye} onAction={handleShowDetail} title="Show Detail" />
        {taskUrl && (
          <Action.OpenInBrowser shortcut={{ key: "o", modifiers: ["cmd"] }} title="Open in Browser" url={taskUrl} />
        )}
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
      </ActionPanel.Section>
      <ActionPanel.Section>
        {state !== "archived" && (
          <Action
            icon={Icon.Trash}
            onAction={handleArchive}
            shortcut={{ key: "x", modifiers: ["ctrl"] }}
            title="Archive"
          />
        )}
        {state === "archived" && (
          <Action icon={Icon.ArrowCounterClockwise} onAction={handleUnarchive} title="Unarchive" />
        )}
        <Action.CopyToClipboard content={task.title} shortcut={{ key: "c", modifiers: ["cmd"] }} title="Copy Title" />
        <Action.CopyToClipboard
          content={task.id}
          shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
          title="Copy ID"
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
