import { Action, ActionPanel, Alert, Icon, List, confirmAlert } from "@raycast/api";
import type { TaskSnapshot } from "../vendor/task-control";
import { useTasks, TaskPush } from "../task-state";
import { duration, isTaskExpired } from "../format";
import { TaskForm } from "./task-form";
import { CommonActions } from "./common-actions";

export function TaskList() {
  const { snapshot, busy, loading, error, now } = useTasks();
  if (!snapshot) return null;
  return (
    <List searchBarPlaceholder="Search bookmarked and recent tasks…" isLoading={busy || loading}>
      <List.Section>
        {error && (
          <List.Item
            title={error}
            icon={Icon.ExclamationMark}
            actions={
              <ActionPanel>
                <CommonActions />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          title={snapshot.weekSpent ? "Weekly task allowance used" : "New Task"}
          subtitle={
            snapshot.task && !isTaskExpired(snapshot, now) ? "Finish the current task to start another" : undefined
          }
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              {snapshot.canStart && !busy && (
                <TaskPush
                  title="New Task"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<TaskForm navigationTitle="Happy Squid" purpose="start" displayed={snapshot} />}
                />
              )}
              {snapshot.weekSpent && <Action.OpenInBrowser title="View Plans" url="https://happy-squid.com/#pricing" />}
              <CommonActions />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Bookmarked">
        {snapshot.recentTasks
          .filter((task) => task.bookmarked)
          .map((task) => (
            <RecentTask key={task.description} task={task} snapshot={snapshot} />
          ))}
      </List.Section>
      <List.Section title="Recent">
        {snapshot.recentTasks
          .filter((task) => !task.bookmarked)
          .map((task) => (
            <RecentTask key={task.description} task={task} snapshot={snapshot} />
          ))}
      </List.Section>
    </List>
  );
}

function RecentTask({ task, snapshot }: { task: TaskSnapshot["recentTasks"][number]; snapshot: TaskSnapshot }) {
  const { perform, busy } = useTasks();
  const remove = async () => {
    if (
      await confirmAlert({
        title: "Delete this task?",
        message: `You have worked on this task for ${duration(task.workedMs)}.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await perform({ kind: "delete-recent", description: task.description }, snapshot);
    }
  };
  return (
    <List.Item
      title={task.description}
      icon={task.bookmarked ? Icon.Bookmark : Icon.Circle}
      accessories={[{ text: duration(task.durationMinutes * 60_000) }]}
      actions={
        <ActionPanel>
          {snapshot.canStart && !busy && (
            <TaskPush
              title="Choose Task"
              icon={Icon.Play}
              target={
                <TaskForm
                  navigationTitle="Happy Squid"
                  purpose="start"
                  displayed={snapshot}
                  description={task.description}
                  durationMinutes={task.durationMinutes}
                />
              }
            />
          )}
          {!busy && (
            <Action
              title={task.bookmarked ? "Remove Bookmark" : "Bookmark Task"}
              icon={Icon.Bookmark}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              onAction={() =>
                perform({ kind: "bookmark", description: task.description, bookmarked: !task.bookmarked }, snapshot)
              }
            />
          )}
          {!busy && <Action title="Delete Task" icon={Icon.Trash} style={Action.Style.Destructive} onAction={remove} />}
          <CommonActions />
        </ActionPanel>
      }
    />
  );
}
