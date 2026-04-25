import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  assertVaultIsReadable,
  listTaskNotes,
  obsidianUrl,
  preferences,
  setTaskStatus,
  taskSubtitle,
  type TaskNote,
} from "./tasknotes";

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(async () => {
    await assertVaultIsReadable();
    return listTaskNotes();
  });

  if (error) {
    return <Detail markdown={`# TaskNotes\n\n${error.message}`} />;
  }

  const prefs = preferences();
  const tasks = data ?? [];
  const openTasks = tasks.filter((task) => !task.completed);
  const completedTasks = prefs.showCompletedTasks ? tasks.filter((task) => task.completed) : [];
  const visibleTaskCount = openTasks.length + completedTasks.length;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search TaskNotes tasks...">
      {!isLoading && visibleTaskCount === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={prefs.showCompletedTasks ? "No TaskNotes tasks found" : "No open TaskNotes tasks found"}
          description="Set the vault mode and folder preferences, then make sure the task tag or property identifier matches TaskNotes settings."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title="Open" subtitle={String(openTasks.length)}>
        {openTasks.map((task) => (
          <TaskListItem key={task.path} task={task} revalidate={revalidate} />
        ))}
      </List.Section>
      {prefs.showCompletedTasks ? (
        <List.Section title="Completed" subtitle={String(completedTasks.length)}>
          {completedTasks.map((task) => (
            <TaskListItem key={task.path} task={task} revalidate={revalidate} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function TaskListItem({ task, revalidate }: { task: TaskNote; revalidate: () => void }) {
  const isDone = task.completed;

  return (
    <List.Item
      title={task.title}
      subtitle={taskSubtitle(task)}
      icon={{ source: isDone ? Icon.CheckCircle : Icon.Circle, tintColor: isDone ? Color.Green : Color.SecondaryText }}
      accessories={taskAccessories(task)}
      actions={<TaskActions task={task} revalidate={revalidate} />}
    />
  );
}

function taskAccessories(task: TaskNote): List.Item.Accessory[] {
  return [
    { tag: { value: task.vaultName, color: Color.SecondaryText } },
    ...(task.due ? [{ tag: { value: `Due ${task.due}`, color: Color.Red } }] : []),
  ];
}

function TaskActions({ task, revalidate }: { task: TaskNote; revalidate: () => void }) {
  const isDone = task.completed;

  async function updateStatus(status: string) {
    await setTaskStatus(task, status);
    await showToast({
      style: Toast.Style.Success,
      title: status === task.doneStatus ? "Task completed" : "Task reopened",
      message: task.title,
    });
    revalidate();
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
