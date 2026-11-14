import { ActionPanel, Action, Icon, Detail, getPreferenceValues, Image, Keyboard } from "@raycast/api";
import { getAvatarIcon, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { ChangeStatus, ChangePriority, CopyTaskTitle, CopyTaskDescription, SubTask, ParentTask } from "../shortcut";
import { KaneoAPI } from "../api/kaneo";
import { formatDate, cleanDescription, statusKey, priorityKey } from "../lib/task-helpers";
import { resolveImageUrl } from "../lib/get-api-url";
import { useTaskCustomFields } from "../hooks/useTaskCustomFields";

type TaskDetailViewProps = {
  taskId: string;
  projectId: string;
  columnStatuses: Array<{ isDone: boolean; id: string; name: string }>;
  columnPriorities: Array<{ id: string; name: string }>;
  onStatusUpdate: (taskId: string, newStatus: string, taskTitle: string) => Promise<void>;
  onPriorityUpdate: (taskId: string, newPriority: string, taskTitle: string) => Promise<void>;
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const withModifiers = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({
  Windows: { modifiers: ["ctrl", "shift"], key },
  macOS: { modifiers: ["cmd", "shift"], key },
});

export function TaskDetailView({
  taskId,
  projectId,
  columnStatuses,
  columnPriorities,
  onStatusUpdate,
  onPriorityUpdate,
}: TaskDetailViewProps) {
  const api = useMemo(() => new KaneoAPI(), []);
  const { webInstanceUrl, workspaceId } = getPreferenceValues<Preferences>();

  const { isLoading, data: task, revalidate } = usePromise((id: string) => api.getTask(id), [taskId]);
  const { fields: customFields, revalidate: revalidateCustomFields } = useTaskCustomFields(taskId, projectId);

  if (isLoading || !task) {
    return <Detail isLoading markdown="Loading task..." />;
  }

  const refresh = () => Promise.all([revalidate(), revalidateCustomFields()]);

  const status = task.status ? capitalize(task.status) : "N/A";
  const priority = capitalize((task.priority || "no-priority").replaceAll("-", " "));
  const dueDate = formatDate(task.dueDate);
  const createdAt = formatDate(task.createdAt);
  const assigneeName = task.assigneeName;
  const description = cleanDescription(task.description);

  const parentTasks = task.parentTasks ?? [];
  const subTasks = task.subTasks ?? [];

  const getTaskUrl = (id: string) => {
    const url = new URL(webInstanceUrl);
    url.pathname = `/dashboard/workspace/${workspaceId}/project/${projectId}/board`;
    url.searchParams.set("taskId", id);
    return url.toString();
  };

  const handleStatusUpdate: TaskDetailViewProps["onStatusUpdate"] = async (id, newStatus, title) => {
    await onStatusUpdate(id, newStatus, title);
    await revalidate();
  };

  const handlePriorityUpdate: TaskDetailViewProps["onPriorityUpdate"] = async (id, newPriority, title) => {
    await onPriorityUpdate(id, newPriority, title);
    await revalidate();
  };

  const renderTaskView = (id: string) => (
    <TaskDetailView
      taskId={id}
      projectId={projectId}
      columnStatuses={columnStatuses}
      columnPriorities={columnPriorities}
      onStatusUpdate={handleStatusUpdate}
      onPriorityUpdate={handlePriorityUpdate}
    />
  );

  const parentLine =
    parentTasks.length > 0
      ? `**Subtask of** ${parentTasks.map((p) => `[${p.title}](${getTaskUrl(p.id)})`).join("\n")}\n\n`
      : "";

  const markdown = `${parentLine}# ${task.title}

## Description
${description}

## Status
${status}

## Priority
${priority}

## Due Date
${dueDate}

## Assignee
${assigneeName || "Unassigned"}

## Created At
${createdAt}
`;

  return (
    <Detail
      navigationTitle={task.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={status} />
          <Detail.Metadata.Label title="Priority" text={priority} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Due Date" text={dueDate} />
          <Detail.Metadata.Label
            title="Assignee"
            text={assigneeName || "Unassigned"}
            icon={
              assigneeName
                ? task.assigneeImage
                  ? { source: resolveImageUrl(task.assigneeImage), mask: Image.Mask.Circle }
                  : getAvatarIcon(assigneeName)
                : undefined
            }
          />
          {customFields.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              {customFields.map((field) => (
                <Detail.Metadata.Label key={field.id} title={field.name} text={field.text ?? "—"} />
              ))}
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created At" text={createdAt} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Kaneo Web" url={getTaskUrl(task.id)} />

          {parentTasks.length > 0 && (
            <Action.Push
              title="Open Parent Task"
              icon={Icon.Binoculars}
              shortcut={ParentTask}
              target={renderTaskView(parentTasks[0].id)}
              onPop={refresh}
            />
          )}

          {subTasks.length > 0 && (
            <ActionPanel.Submenu title="Sub Tasks" icon={Icon.List} shortcut={SubTask}>
              {subTasks.map((subTask) => (
                <Action.Push
                  key={subTask.id}
                  title={subTask.title}
                  icon={Icon.Binoculars}
                  target={renderTaskView(subTask.id)}
                  onPop={refresh}
                />
              ))}
            </ActionPanel.Submenu>
          )}

          <ActionPanel.Submenu title="Change Status…" icon={Icon.List} shortcut={ChangeStatus}>
            {columnStatuses
              .filter((s) => s.id !== task.status)
              .map((s) => (
                <Action
                  key={s.id}
                  title={s.name}
                  icon={s.isDone ? Icon.CircleProgress100 : Icon.Circle}
                  shortcut={statusKey[s.id] ? withModifiers(statusKey[s.id]) : undefined}
                  onAction={() => handleStatusUpdate(task.id, s.id, task.title)}
                />
              ))}
          </ActionPanel.Submenu>

          <ActionPanel.Submenu title="Change Priority…" icon={Icon.List} shortcut={ChangePriority}>
            {columnPriorities
              .filter((p) => p.id !== (task.priority || "no-priority"))
              .map((p) => (
                <Action
                  key={p.id}
                  title={p.name}
                  icon={Icon.Circle}
                  shortcut={withModifiers(priorityKey[p.id] ?? "p")}
                  onAction={() => handlePriorityUpdate(task.id, p.id, task.title)}
                />
              ))}
          </ActionPanel.Submenu>

          <Action.CopyToClipboard title="Copy Task Title" content={task.title} shortcut={CopyTaskTitle} />
          {task.description && (
            <Action.CopyToClipboard
              title="Copy Task Description"
              content={description}
              shortcut={CopyTaskDescription}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
