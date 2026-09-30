import { ActionPanel, Action, Icon, Detail, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ChangeStatus, ChangePriority, CopyTaskTitle, CopyTaskDescription, SubTask, ParentTask } from "../shortcut";
import { KaneoAPI } from "../api/kaneo";
import { formatDate, cleanDescription, statusKey, priorityKey } from "../lib/task-helpers";

export function TaskDetailView({
  taskId,
  projectId,
  columnStatuses,
  columnPriorities,
  onStatusUpdate,
  onPriorityUpdate,
}: {
  taskId: string;
  projectId: string;
  columnStatuses: Array<{
    isDone: boolean;
    id: string;
    name: string;
  }>;
  columnPriorities: Array<{ id: string; name: string }>;
  onStatusUpdate: (taskId: string, newStatus: string, taskTitle: string) => Promise<void>;
  onPriorityUpdate: (taskId: string, newPriority: string, taskTitle: string) => Promise<void>;
}) {
  const api = new KaneoAPI();
  const { webInstanceUrl, workspaceId } = getPreferenceValues<Preferences>();

  const { isLoading, data: task, revalidate } = usePromise((id: string) => api.getTask(id), [taskId]);

  if (isLoading || !task) {
    return <Detail isLoading markdown="Loading task..." />;
  }

  const status = task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : "N/A";
  const priorityRaw = task.priority || "no-priority";
  const priority = priorityRaw.charAt(0).toUpperCase() + priorityRaw.slice(1).replaceAll("-", " ");

  const openTask = (taskId: string) => {
    const webUrl = new URL(webInstanceUrl);
    webUrl.pathname = `/dashboard/workspace/${workspaceId}/project/${projectId}/board`;
    webUrl.searchParams.set("taskId", taskId);
    return webUrl.toString();
  };

  const parentTasks = task.parentTasks || [];
  const subTasks = task.subTasks || [];

  const markdown = `${parentTasks.length > 0 ? `**Subtask of** ${parentTasks.map((parentTask) => `[${parentTask.title}](${openTask(parentTask.id)})`).join("\n")}\n\n` : ""}
  # ${task.title}


## Description
${cleanDescription(task.description)}


## Status
${status}


## Priority
${priority}


## Due Date
${formatDate(task.dueDate)}


## Assignee
${task.assigneeName || "Unassigned"}


## Created At
${formatDate(task.createdAt)}
`;

  const handleStatusUpdate = async (taskId: string, newStatus: string, taskTitle: string) => {
    await onStatusUpdate(taskId, newStatus, taskTitle);
    await revalidate();
  };

  const handlePriorityUpdate = async (taskId: string, newPriority: string, taskTitle: string) => {
    await onPriorityUpdate(taskId, newPriority, taskTitle);
    await revalidate();
  };

  return (
    <Detail
      navigationTitle={task.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status} />
          <Detail.Metadata.Label title="Priority" text={priority} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Due Date" text={formatDate(task.dueDate)} />
          <Detail.Metadata.Label title="Assignee" text={task.assigneeName || "Unassigned"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created At" text={formatDate(task.createdAt)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Kaneo Web" url={openTask(task.id)} />

          {parentTasks.length > 0 && (
            <Action.Push
              title="Open Parent Task"
              icon={Icon.Binoculars}
              shortcut={ParentTask}
              target={
                <TaskDetailView
                  taskId={parentTasks[0].id}
                  projectId={projectId}
                  columnStatuses={columnStatuses}
                  columnPriorities={columnPriorities}
                  onStatusUpdate={handleStatusUpdate}
                  onPriorityUpdate={handlePriorityUpdate}
                />
              }
              onPop={revalidate}
            />
          )}

          {subTasks.length > 0 && (
            <ActionPanel.Submenu title="Sub Tasks" icon={Icon.List} shortcut={SubTask}>
              {subTasks.map((subTask) => (
                <Action.Push
                  key={subTask.id}
                  title={subTask.title}
                  icon={Icon.Binoculars}
                  target={
                    <TaskDetailView
                      taskId={subTask.id}
                      projectId={projectId}
                      columnStatuses={columnStatuses}
                      columnPriorities={columnPriorities}
                      onStatusUpdate={handleStatusUpdate}
                      onPriorityUpdate={handlePriorityUpdate}
                    />
                  }
                  onPop={revalidate}
                />
              ))}
            </ActionPanel.Submenu>
          )}

          <ActionPanel.Submenu title="Change Status…" icon={Icon.List} shortcut={ChangeStatus}>
            {columnStatuses
              .filter((status) => status.id !== task.status)
              .map((status) => {
                return (
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
                    onAction={() => handleStatusUpdate(task.id, status.id, task.title)}
                  />
                );
              })}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu title="Change Priority…" icon={Icon.List} shortcut={ChangePriority}>
            {columnPriorities
              .filter((priority) => priority.id !== (task.priority || "no-priority"))
              .map((priority) => (
                <Action
                  key={priority.id}
                  icon={Icon.Circle}
                  shortcut={{
                    Windows: { modifiers: ["ctrl", "shift"], key: priorityKey[priority.id] ?? "p" },
                    macOS: { modifiers: ["cmd", "shift"], key: priorityKey[priority.id] ?? "p" },
                  }}
                  title={priority.name}
                  onAction={() => handlePriorityUpdate(task.id, priority.id, task.title)}
                />
              ))}
          </ActionPanel.Submenu>

          <Action.CopyToClipboard title="Copy Task Title" content={task.title} shortcut={CopyTaskTitle} />
          {task.description && (
            <Action.CopyToClipboard
              title="Copy Task Description"
              content={cleanDescription(task.description)}
              shortcut={CopyTaskDescription}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
