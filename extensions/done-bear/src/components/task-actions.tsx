import { Action, ActionPanel, Icon, showToast, Toast, useNavigation } from "@raycast/api";
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

async function withErrorToast(action: string, fn: () => Promise<void>, revalidate: () => void) {
  try {
    await showToast({ style: Toast.Style.Animated, title: `${action}...` });
    await fn();
    await showToast({ style: Toast.Style.Success, title: action });
    revalidate();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed: ${action}`,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function TaskActions({ task, projects, revalidate, workspaces }: TaskActionsProps) {
  const { push } = useNavigation();
  const state = getTaskState(task);
  const workspace = workspaces?.find((w) => w.id === task.workspaceId);
  const taskUrl = workspace?.urlKey ? `https://donebear.com/${workspace.urlKey}/task/${task.id}` : null;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.Eye}
          onAction={() => push(<TaskDetail projects={projects} revalidate={revalidate} task={task} />)}
          title="Show Detail"
        />
        {taskUrl && (
          <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} title="Open in Browser" url={taskUrl} />
        )}
        {state === "open" && (
          <Action
            icon={Icon.CheckCircle}
            onAction={() => withErrorToast("Task completed", () => completeTask(task.id), revalidate)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            title="Mark as Completed"
          />
        )}
        {state === "done" && (
          <Action
            icon={Icon.ArrowCounterClockwise}
            onAction={() => withErrorToast("Task reopened", () => reopenTask(task.id), revalidate)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            title="Reopen Task"
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {state !== "archived" && (
          <Action
            icon={Icon.Trash}
            onAction={() => withErrorToast("Task archived", () => archiveTask(task.id), revalidate)}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            title="Archive"
          />
        )}
        {state === "archived" && (
          <Action
            icon={Icon.ArrowCounterClockwise}
            onAction={() => withErrorToast("Task unarchived", () => unarchiveTask(task.id), revalidate)}
            title="Unarchive"
          />
        )}
        <Action.CopyToClipboard content={task.title} shortcut={{ modifiers: ["cmd"], key: "c" }} title="Copy Title" />
        <Action.CopyToClipboard
          content={task.id}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          title="Copy ID"
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
