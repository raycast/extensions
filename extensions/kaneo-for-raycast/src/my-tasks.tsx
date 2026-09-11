import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { ChangeStatus, CopyTaskTitle, Revalidate } from "./shortcut";
import { Task } from "./types";
import { KaneoAPI } from "./api/kaneo";
import { useAuthSession } from "./hooks/useAuthSession";
import { TaskDetailView } from "./components/TaskDetailView";
import {
  formatShortDate,
  priorityColor,
  columnPriorities,
  comparePriority,
  compareDueDate,
  dueDateColor,
  statusKey,
  rankIn,
} from "./lib/task-helpers";

type ColumnStatus = { id: string; name: string; isDone: boolean };

type MyTask = {
  task: Task;
  projectId: string;
  projectName: string;
  statusId: string;
  statusName: string;
  columnStatuses: ColumnStatus[];
};

const STATUS_ORDER = ["backlog", "to-do", "in-progress", "in-review"];

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export default function Command() {
  const api = new KaneoAPI();
  const { workspaceId, sort, webInstanceUrl } = getPreferenceValues<Preferences>();
  const { session, isLoading: sessionLoading, error: sessionError } = useAuthSession();
  const userId = session?.user?.id ?? session?.session?.userId ?? null;

  const {
    isLoading: boardLoading,
    data: board = [],
    error,
    revalidate,
  } = usePromise((ws: string) => api.getWorkspaceBoard(ws), [workspaceId]);

  const isLoading = boardLoading || sessionLoading;

  const openTaskUrl = (projectId: string, taskId: string) => {
    const webUrl = new URL(webInstanceUrl);
    webUrl.pathname = `/dashboard/workspace/${workspaceId}/project/${projectId}/board`;
    webUrl.searchParams.set("taskId", taskId);
    return webUrl.toString();
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, taskTitle: string) => {
    await showToast({ style: Toast.Style.Animated, title: "Updating task status..." });
    try {
      await api.updateTaskStatus(taskId, newStatus);
      showToast(Toast.Style.Success, "Task status updated", `"${taskTitle}" moved to ${newStatus}`);
      await revalidate();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to update task status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const updateTaskPriority = async (taskId: string, newPriority: string, taskTitle: string) => {
    await showToast({ style: Toast.Style.Animated, title: "Updating task priority..." });
    try {
      await api.updateTaskPriority(taskId, newPriority);
      showToast(Toast.Style.Success, "Task priority updated", `"${taskTitle}" set to ${newPriority}`);
      await revalidate();
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to update task priority",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const combinedError = error ?? (sessionError ? new Error(sessionError) : null);
  if (combinedError) {
    const isUnauthorized = combinedError.message.includes("Unauthorized") || combinedError.message.includes("401");

    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={isUnauthorized ? "Authentication Failed" : "Error Loading Tasks"}
          description={
            isUnauthorized
              ? "Your API token appears to be invalid or expired.\nPlease check your extension settings."
              : `Failed to load tasks: ${combinedError.message}`
          }
          actions={
            <ActionPanel>
              <Action title="Open Raycast Preferences" onAction={openExtensionPreferences} />
              <Action.CopyToClipboard title="Copy Error Message" content={combinedError.message} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isLoading && !combinedError && userId === null) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Resolve User"
          description="Could not resolve your user ID from the session.\nTry reopening the extension or re-authenticating."
          actions={
            <ActionPanel>
              <Action title="Open Raycast Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Flatten to only open (non-final column) tasks assigned to the current user.
  const mine: MyTask[] = [];
  for (const { project, columns } of board) {
    const columnStatuses: ColumnStatus[] = columns.map((col) => ({
      id: col.id,
      name: col.name,
      isDone: col.isFinal,
    }));
    for (const col of columns) {
      if (col.isFinal) continue;
      for (const task of col.tasks) {
        if (!userId || task.assigneeId !== userId) continue;
        mine.push({
          task,
          projectId: project.id.toString(),
          projectName: project.name,
          statusId: col.id,
          statusName: col.name,
          columnStatuses,
        });
      }
    }
  }

  // Group by status, then order the groups by the canonical Kaneo status order.
  const groups = new Map<string, { name: string; items: MyTask[] }>();
  for (const entry of mine) {
    const group = groups.get(entry.statusId);
    if (group) {
      group.items.push(entry);
    } else {
      groups.set(entry.statusId, { name: entry.statusName, items: [entry] });
    }
  }

  const orderedGroups = [...groups.entries()].sort(([a], [b]) => rankIn(STATUS_ORDER, a) - rankIn(STATUS_ORDER, b));

  const compareMyTasks = sort === "priority" ? comparePriority : compareDueDate;
  const sortMyTasks = (items: MyTask[]): MyTask[] => [...items].sort((a, b) => compareMyTasks(a.task, b.task));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search my tasks...">
      <List.EmptyView
        icon={Icon.CheckCircle}
        title="No open tasks assigned to you"
        description="Tasks assigned to you across all projects will appear here."
      />
      {orderedGroups.map(([statusId, group]) => (
        <List.Section key={statusId} title={group.name} subtitle={`${group.items.length}`}>
          {sortMyTasks(group.items).map((entry) => {
            const item = entry.task;
            const priorityRaw = item.priority || "no-priority";

            return (
              <List.Item
                key={item.id}
                icon={Icon.Circle}
                title={item.title}
                subtitle={entry.projectName}
                keywords={[entry.projectName]}
                accessories={[
                  ...(item.dueDate
                    ? [
                        {
                          tag: { value: formatShortDate(item.dueDate), color: dueDateColor(item.dueDate) },
                          tooltip: "Due Date",
                        },
                      ]
                    : []),
                  {
                    tag: { value: capitalize(priorityRaw).replaceAll("-", " "), color: priorityColor[priorityRaw] },
                    tooltip: "Priority",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open Task"
                      icon={Icon.Binoculars}
                      target={
                        <TaskDetailView
                          taskId={item.id}
                          projectId={entry.projectId}
                          columnStatuses={entry.columnStatuses}
                          columnPriorities={columnPriorities}
                          onStatusUpdate={updateTaskStatus}
                          onPriorityUpdate={updateTaskPriority}
                        />
                      }
                      onPop={revalidate}
                    />

                    <Action.OpenInBrowser title="Open in Kaneo Web" url={openTaskUrl(entry.projectId, item.id)} />

                    <Action.CopyToClipboard title="Copy Task Title" content={item.title} shortcut={CopyTaskTitle} />

                    <ActionPanel.Submenu title="Change Status…" icon={Icon.List} shortcut={ChangeStatus}>
                      {entry.columnStatuses
                        .filter((status) => status.id !== item.status)
                        .map((status) => (
                          <Action
                            key={status.id}
                            icon={status.isDone ? Icon.CircleProgress100 : Icon.Circle}
                            shortcut={
                              statusKey[status.id]
                                ? {
                                    Windows: { modifiers: ["ctrl", "shift"], key: statusKey[status.id] },
                                    macOS: { modifiers: ["cmd", "shift"], key: statusKey[status.id] },
                                  }
                                : undefined
                            }
                            title={status.name}
                            onAction={() => updateTaskStatus(item.id, status.id, item.title)}
                          />
                        ))}
                    </ActionPanel.Submenu>

                    <Action
                      title="Revalidate"
                      icon={Icon.RotateAntiClockwise}
                      shortcut={Revalidate}
                      onAction={() => revalidate()}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
