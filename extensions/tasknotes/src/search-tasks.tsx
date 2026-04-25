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

  const tasks = data ?? [];
  const prefs = preferences();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search TaskNotes tasks...">
      {!isLoading && tasks.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No TaskNotes tasks found"
          description="Set the vault mode and folder preferences, then make sure the task tag or property identifier matches TaskNotes settings."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title="Open" subtitle={String(tasks.filter((task) => task.status !== prefs.doneStatus).length)}>
        {tasks
          .filter((task) => task.status !== prefs.doneStatus)
          .map((task) => (
            <TaskListItem key={task.path} task={task} revalidate={revalidate} />
          ))}
      </List.Section>
      <List.Section
        title="Completed"
        subtitle={String(tasks.filter((task) => task.status === prefs.doneStatus).length)}
      >
        {tasks
          .filter((task) => task.status === prefs.doneStatus)
          .map((task) => (
            <TaskListItem key={task.path} task={task} revalidate={revalidate} />
          ))}
      </List.Section>
    </List>
  );
}

function TaskListItem({ task, revalidate }: { task: TaskNote; revalidate: () => void }) {
  const prefs = preferences();
  const isDone = task.status === prefs.doneStatus;

  return (
    <List.Item
      title={task.title}
      subtitle={taskSubtitle(task)}
      icon={{ source: isDone ? Icon.CheckCircle : Icon.Circle, tintColor: isDone ? Color.Green : Color.SecondaryText }}
      accessories={[
        ...(task.due ? [{ tag: { value: `Due ${task.due}`, color: Color.Red } }] : []),
        ...(task.scheduled ? [{ tag: { value: `Scheduled ${task.scheduled}`, color: Color.Blue } }] : []),
        { text: task.vaultName },
        { text: task.relativePath },
      ]}
      actions={<TaskActions task={task} revalidate={revalidate} />}
    />
  );
}

function TaskActions({ task, revalidate }: { task: TaskNote; revalidate: () => void }) {
  const prefs = preferences();
  const isDone = task.status === prefs.doneStatus;

  async function updateStatus(status: string) {
    await setTaskStatus(task, status);
    await showToast({
      style: Toast.Style.Success,
      title: status === prefs.doneStatus ? "Task completed" : "Task reopened",
      message: task.title,
    });
    revalidate();
  }

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open in Obsidian" url={obsidianUrl(task)} icon={Icon.Window} />
      {isDone ? (
        <Action title="Reopen Task" icon={Icon.RotateClockwise} onAction={() => updateStatus(prefs.openStatus)} />
      ) : (
        <Action title="Complete Task" icon={Icon.CheckCircle} onAction={() => updateStatus(prefs.doneStatus)} />
      )}
      <Action.Open title="Open Markdown File" target={task.path} />
      <Action.ShowInFinder path={task.path} />
      <Action.CopyToClipboard title="Copy Markdown Link" content={`[[${task.relativePath.replace(/\.md$/i, "")}]]`} />
    </ActionPanel>
  );
}
