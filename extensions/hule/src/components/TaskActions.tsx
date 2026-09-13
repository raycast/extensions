import { Action, ActionPanel, Alert, Icon, Toast, confirmAlert, showToast, Keyboard } from "@raycast/api";
import { PRIORITY_LABELS, deleteTask, taskUrl, updateTask } from "../api/client";
import { PRIORITIES, type Priority, type Task } from "../api/types";
import { OpenTaskAction } from "./OpenTaskAction";
import { memberIcon, statusIcon } from "../helpers/appearance";
import { toFloatingDay } from "../helpers/dates";
import type { HuleContext } from "../hooks/useHule";

/**
 * One place where a write reports itself: an in-flight toast, then success or
 * the API's own message. Without it every action would grow its own try/catch
 * and they would drift apart.
 */
async function run(label: string, action: () => Promise<unknown>, onDone: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: label });
  try {
    await action();
    toast.style = Toast.Style.Success;
    toast.title = `${label} — done`;
    onDone();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = label;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export function TaskActions({ task, context, onChange }: { task: Task; context: HuleContext; onChange: () => void }) {
  const statuses = context.statusesOf(task.listId);
  const members = context.membersOf(task.workspaceId);

  return (
    <>
      <ActionPanel.Section>
        <OpenTaskAction task={task} />
        <Action.CopyToClipboard title="Copy Link" content={taskUrl(task)} shortcut={Keyboard.Shortcut.Common.Copy} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <ActionPanel.Submenu title="Change Status…" icon={Icon.Circle} shortcut={{ modifiers: ["opt"], key: "s" }}>
          {statuses.map((status) => (
            <Action
              key={status.id}
              title={status.label}
              icon={statusIcon(status)}
              onAction={() =>
                run(`Status → ${status.label}`, () => updateTask(task.id, { statusId: status.id }), onChange)
              }
            />
          ))}
        </ActionPanel.Submenu>

        <ActionPanel.Submenu
          title="Change Priority…"
          icon={Icon.Exclamationmark}
          shortcut={{ modifiers: ["opt"], key: "p" }}
        >
          {PRIORITIES.map((priority: Priority) => (
            <Action
              key={priority}
              title={PRIORITY_LABELS[priority]}
              icon={priority === task.priority ? Icon.CheckCircle : Icon.Circle}
              onAction={() =>
                run(`Priority → ${PRIORITY_LABELS[priority]}`, () => updateTask(task.id, { priority }), onChange)
              }
            />
          ))}
        </ActionPanel.Submenu>

        <Action.PickDate
          title="Set Due Date…"
          type={Action.PickDate.Type.Date}
          shortcut={{ modifiers: ["opt"], key: "d" }}
          onChange={(date) =>
            run(
              date ? `Due ${toFloatingDay(date)}` : "Clear due date",
              () => updateTask(task.id, { dueDate: date ? toFloatingDay(date) : null, allDay: true }),
              onChange,
            )
          }
        />

        <ActionPanel.Submenu title="Assign to…" icon={Icon.Person} shortcut={{ modifiers: ["opt"], key: "a" }}>
          {members.map((member) => (
            <Action
              key={member.id}
              title={member.name ?? member.email ?? member.id}
              icon={memberIcon(member)}
              onAction={() =>
                run(
                  `Assign to ${member.name ?? member.email ?? "member"}`,
                  () => updateTask(task.id, { assigneeId: member.id }),
                  onChange,
                )
              }
            />
          ))}
          <Action
            title="Nobody"
            icon={Icon.MinusCircle}
            onAction={() => run("Unassign", () => updateTask(task.id, { assigneeId: null }), onChange)}
          />
        </ActionPanel.Submenu>
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete this task?",
              message: `“${task.title}” and its subtasks and comments are removed for good.`,
              primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
            });
            if (confirmed) await run("Delete task", () => deleteTask(task.id), onChange);
          }}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onChange}
        />
      </ActionPanel.Section>
    </>
  );
}
