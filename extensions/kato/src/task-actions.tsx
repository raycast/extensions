import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { katoApi } from "./api";
import { CreateCommentForm } from "./create-comment";
import { CreateTaskForm } from "./create-task";
import { EditTaskForm } from "./edit-task";
import { TaskDetailView } from "./task-detail";
import type { Task, TaskStatus } from "./types";

export function TaskActions({
  task,
  statuses,
  showDetailsAction = true,
  detailsActionTitle = "View Task",
  detailToggle,
  onUpdated,
  onCompleted,
  onBeforeComplete,
  onCompleteError,
}: {
  task: Pick<Task, "id" | "title" | "status" | "webUrl">;
  statuses: TaskStatus[];
  showDetailsAction?: boolean;
  detailsActionTitle?: string;
  detailToggle?: { isShowing: boolean; onToggle: () => void };
  onUpdated?: (task: Task) => void;
  onCompleted?: (
    task: Task,
    previousStatus: string,
  ) => { undo?: () => void | Promise<void> } | void;
  onBeforeComplete?: () => void;
  onCompleteError?: () => void;
}) {
  const complete = statuses.find((status) => status.isComplete);
  const current = statuses.find((status) => status.slug === task.status);
  const reopen =
    statuses.find((status) => status.isDefault && !status.isComplete) ??
    statuses.find((status) => !status.isComplete);

  async function changeStatus(status: TaskStatus) {
    const previousStatus = task.status;
    if (status.isComplete) onBeforeComplete?.();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Moving to ${status.name}…`,
    });
    try {
      const updated = await katoApi.updateTask(task.id, {
        status: status.slug,
      });
      toast.style = Toast.Style.Success;
      toast.title = status.isComplete
        ? "Task completed"
        : `Moved to ${status.name}`;
      if (status.isComplete && onCompleted) {
        const result = onCompleted(updated, previousStatus);
        if (result?.undo)
          toast.primaryAction = { title: "Undo", onAction: result.undo };
      } else onUpdated?.(updated);
    } catch (error) {
      if (status.isComplete) onCompleteError?.();
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update task";
      toast.message = (error as Error).message;
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {detailToggle && !detailToggle.isShowing ? (
          <Action
            title="Show Details"
            icon={Icon.Sidebar}
            onAction={detailToggle.onToggle}
          />
        ) : showDetailsAction ? (
          <Action.Push
            title={detailsActionTitle}
            icon={Icon.Sidebar}
            target={<TaskDetailView taskId={task.id} />}
          />
        ) : null}
        {detailToggle?.isShowing ? (
          <Action
            title="Hide Details"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={detailToggle.onToggle}
          />
        ) : null}
        {complete && !current?.isComplete ? (
          <Action
            title="Mark Complete"
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onAction={() => void changeStatus(complete)}
          />
        ) : null}
        {current?.isComplete && reopen ? (
          <Action
            title="Undo Completion"
            icon={Icon.ArrowCounterClockwise}
            onAction={() => void changeStatus(reopen)}
          />
        ) : null}
        <Action.OpenInBrowser title="Open in Kato" url={task.webUrl} />
        <Action.Push
          title="Create Another Task"
          icon={Icon.Plus}
          target={<CreateTaskForm context={{ label: task.title }} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Status">
        <ActionPanel.Submenu title="Change Status" icon={Icon.ArrowRightCircle}>
          {statuses.map((status) => (
            <Action
              key={status.id}
              title={status.name}
              icon={status.slug === task.status ? Icon.Checkmark : Icon.Circle}
              onAction={() => void changeStatus(status)}
            />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Change Priority" icon={Icon.Flag}>
          {(
            [
              ["urgent", "Urgent"],
              ["high", "High"],
              ["medium", "Medium"],
              ["low", "Low"],
              ["no_priority", "No Priority"],
            ] as const
          ).map(([priority, title]) => (
            <Action
              key={priority}
              title={title}
              onAction={async () => {
                const updated = await katoApi.updateTask(task.id, { priority });
                onUpdated?.(updated);
              }}
            />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Change Due Date" icon={Icon.Calendar}>
          <Action
            title="Today"
            onAction={async () => {
              const due = new Date();
              due.setHours(17, 0, 0, 0);
              onUpdated?.(
                await katoApi.updateTask(task.id, {
                  dueDate: due.toISOString(),
                }),
              );
            }}
          />
          <Action
            title="Tomorrow"
            onAction={async () => {
              const due = new Date();
              due.setDate(due.getDate() + 1);
              due.setHours(17, 0, 0, 0);
              onUpdated?.(
                await katoApi.updateTask(task.id, {
                  dueDate: due.toISOString(),
                }),
              );
            }}
          />
          <Action
            title="No Due Date"
            onAction={async () => {
              onUpdated?.(await katoApi.updateTask(task.id, { dueDate: null }));
            }}
          />
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Change Estimate" icon={Icon.Clock}>
          {([15, 30, 60, 120, 240, 480] as const).map((minutes) => (
            <Action
              key={minutes}
              title={
                minutes < 60 ? `${minutes} Minutes` : `${minutes / 60} Hours`
              }
              onAction={async () => {
                onUpdated?.(
                  await katoApi.updateTask(task.id, { estimatedTime: minutes }),
                );
              }}
            />
          ))}
          <Action
            title="No Estimate"
            onAction={async () => {
              onUpdated?.(
                await katoApi.updateTask(task.id, { estimatedTime: null }),
              );
            }}
          />
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Task"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<EditTaskForm taskId={task.id} onUpdated={onUpdated} />}
        />
        <Action.Push
          title="Comment on Task"
          icon={Icon.Message}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          target={
            <CreateCommentForm
              context={{
                entityType: "task",
                entityId: task.id,
                label: task.title,
              }}
            />
          }
        />
        <Action.Push
          title="Create Follow-Up Task"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          target={
            <CreateTaskForm
              context={{
                label: task.title,
                suggestedTitle: `Follow up: ${task.title}`,
              }}
            />
          }
        />
        <Action.CopyToClipboard
          title="Copy Kato Link"
          content={task.webUrl}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action
          title="Open in Kato"
          icon={Icon.Globe}
          onAction={() => void open(task.webUrl)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
