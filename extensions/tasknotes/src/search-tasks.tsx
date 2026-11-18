import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { assertVaultIsReadable, isMultipleVaultMode, listTaskNotes, preferences } from "./tasknotes";
import { TaskListItem } from "./task-list-item";

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(async () => {
    await assertVaultIsReadable();
    return listTaskNotes();
  });

  if (error) {
    return <Detail markdown={`# TaskNotes\n\n${error.message}`} />;
  }

  const prefs = preferences();
  const showVaultBadge = isMultipleVaultMode();
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
          <TaskListItem key={task.path} task={task} revalidate={revalidate} showVaultBadge={showVaultBadge} />
        ))}
      </List.Section>
      {prefs.showCompletedTasks ? (
        <List.Section title="Completed" subtitle={String(completedTasks.length)}>
          {completedTasks.map((task) => (
            <TaskListItem key={task.path} task={task} revalidate={revalidate} showVaultBadge={showVaultBadge} />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
