import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { obsidianUrl, setTaskStatus, taskSubtitle, type TaskNote } from "./tasknotes";

type DateAccessoryMode = "due" | "agenda";

export function TaskListItem({
  task,
  revalidate,
  showVaultBadge,
  dateAccessoryMode = "due",
}: {
  task: TaskNote;
  revalidate: () => void;
  showVaultBadge: boolean;
  dateAccessoryMode?: DateAccessoryMode;
}) {
  const isDone = task.completed;

  return (
    <List.Item
      title={task.title}
      subtitle={taskSubtitle(task)}
      icon={{ source: isDone ? Icon.CheckCircle : Icon.Circle, tintColor: isDone ? Color.Green : Color.SecondaryText }}
      accessories={taskAccessories(task, showVaultBadge, dateAccessoryMode)}
      actions={<TaskActions task={task} revalidate={revalidate} />}
    />
  );
}

function taskAccessories(
  task: TaskNote,
  showVaultBadge: boolean,
  dateAccessoryMode: DateAccessoryMode,
): List.Item.Accessory[] {
  return [
    ...dateAccessories(task, dateAccessoryMode),
    ...(showVaultBadge ? [{ tag: { value: task.vaultName, color: Color.SecondaryText } }] : []),
  ];
}

function dateAccessories(task: TaskNote, mode: DateAccessoryMode): List.Item.Accessory[] {
  if (mode === "agenda" && task.due && task.scheduled && new Date(task.scheduled) < new Date(task.due)) {
    return [{ tag: { value: `Scheduled ${task.scheduled}`, color: Color.Blue } }];
  }
  if (task.due) return [{ tag: { value: `Due ${task.due}`, color: Color.Red } }];
  if (mode === "agenda" && task.scheduled)
    return [{ tag: { value: `Scheduled ${task.scheduled}`, color: Color.Blue } }];
  return [];
}

function TaskActions({ task, revalidate }: { task: TaskNote; revalidate: () => void }) {
  const isDone = task.completed;

  async function updateStatus(status: string) {
    try {
      await setTaskStatus(task, status);
      await showToast({
        style: Toast.Style.Success,
        title: status === task.doneStatus ? "Task completed" : "Task reopened",
        message: task.title,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update task",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      revalidate();
    }
  }

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open in Obsidian" url={obsidianUrl(task)} icon={Icon.Window} />
      {isDone ? (
        <Action title="Reopen Task" icon={Icon.RotateClockwise} onAction={() => updateStatus(task.openStatus)} />
      ) : (
        <Action title="Complete Task" icon={Icon.CheckCircle} onAction={() => updateStatus(task.doneStatus)} />
      )}
      <Action.Open title="Open Markdown File" target={task.path} />
      <Action.ShowInFinder path={task.path} />
      <Action.CopyToClipboard title="Copy Markdown Link" content={`[[${task.relativePath.replace(/\.md$/i, "")}]]`} />
      <Action.Trash
        title="Delete Task"
        paths={task.path}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onTrash={() => {
          showToast({ style: Toast.Style.Success, title: "Task moved to Trash", message: task.title });
          revalidate();
        }}
      />
    </ActionPanel>
  );
}
