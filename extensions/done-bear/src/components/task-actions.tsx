import { Action, ActionPanel, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback } from "react";

import { archiveTask, completeTask, reopenTask, unarchiveTask } from "../api/mutations";
import type { NavigableView, ProjectRecord, TaskRecord, WorkspaceSummary } from "../api/types";
import { revalidateAfterMutation } from "../helpers/revalidate";
import { getTaskState } from "../helpers/task-helpers";
import { QuickAddAction } from "./quick-add-action";
import TaskDetail from "./task-detail";

interface TaskActionsProps {
  task: TaskRecord;
  projects: ProjectRecord[];
  revalidate: () => void;
  view?: NavigableView;
  workspaces?: WorkspaceSummary[];
}

interface TaskActionCopy {
  failure: string;
  pending: string;
  success: string;
}

const withErrorToast = async (copy: TaskActionCopy, fn: () => Promise<void>, revalidate: () => void) => {
  await showToast({ style: Toast.Style.Animated, title: copy.pending });
  try {
    await fn();
  } catch {
    await showToast({
      message: "Check your connection and try again.",
      style: Toast.Style.Failure,
      title: copy.failure,
    });
    return;
  }

  await showToast({ style: Toast.Style.Success, title: copy.success });
  await revalidateAfterMutation(revalidate);
};

export const TaskActions = ({ task, projects, revalidate, view, workspaces }: TaskActionsProps) => {
  const { push } = useNavigation();
  const state = getTaskState(task);
  const workspace = workspaces?.find((w) => w.id === task.workspaceId);
  const taskUrl = workspace?.urlKey ? `https://donebear.com/${workspace.urlKey}/task/${task.id}` : null;

  const handleShowDetail = useCallback(() => {
    push(<TaskDetail projects={projects} revalidate={revalidate} task={task} />);
  }, [push, projects, revalidate, task]);

  const handleComplete = useCallback(
    () =>
      withErrorToast(
        { failure: "Couldn't complete task", pending: "Completing task…", success: "Task completed" },
        () => completeTask(task.id),
        revalidate,
      ),
    [task.id, revalidate],
  );

  const handleReopen = useCallback(
    () =>
      withErrorToast(
        { failure: "Couldn't reopen task", pending: "Reopening task…", success: "Task reopened" },
        () => reopenTask(task.id),
        revalidate,
      ),
    [task.id, revalidate],
  );

  const handleArchive = useCallback(
    () =>
      withErrorToast(
        { failure: "Couldn't archive task", pending: "Archiving task…", success: "Task archived" },
        () => archiveTask(task.id),
        revalidate,
      ),
    [task.id, revalidate],
  );

  const handleUnarchive = useCallback(
    () =>
      withErrorToast(
        { failure: "Couldn't unarchive task", pending: "Unarchiving task…", success: "Task unarchived" },
        () => unarchiveTask(task.id),
        revalidate,
      ),
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
      </ActionPanel.Section>
      <ActionPanel.Section title="Create">
        <QuickAddAction fallbackView={view} onCreated={revalidate} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Manage">
        {state !== "archived" && (
          <Action
            icon={Icon.Trash}
            onAction={handleArchive}
            shortcut={{ key: "x", modifiers: ["ctrl"] }}
            title="Archive Task"
          />
        )}
        {state === "archived" && (
          <Action icon={Icon.ArrowCounterClockwise} onAction={handleUnarchive} title="Unarchive Task" />
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
