/**
 * Show Inbox command - displays inbox tasks from Pinwork.
 * Inbox contains unscheduled tasks that need to be processed.
 */

import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { openView } from "./api/pinwork";
import { TaskListItem } from "./components";
import { usePinworkAvailability } from "./hooks/usePinworkAvailability";
import { useInboxTasks } from "./hooks/useInboxTasks";

export default function ShowInboxCommand() {
  const availability = usePinworkAvailability();
  const { tasks, isLoading, error, revalidate, mutate } = useInboxTasks({
    execute: availability.isReady,
  });

  const isBusy = availability.isLoading || isLoading;

  async function handleOpenInbox() {
    await openView("inbox");
  }

  async function handleAddTask() {
    await openView("add");
  }

  async function handleRetry() {
    await availability.revalidate();
    await revalidate();
  }

  return (
    <List
      isLoading={isBusy}
      searchBarPlaceholder="Filter inbox tasks..."
      navigationTitle="Inbox"
    >
      {!availability.installed ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Pinwork Not Installed"
          description="Install the Pinwork app to view tasks."
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : !availability.running ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Pinwork Not Running"
          description="Open Pinwork to load your tasks."
          actions={
            <ActionPanel>
              <Action title="Open Pinwork" onAction={handleOpenInbox} />
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to Load Tasks"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={handleRetry} />
            </ActionPanel>
          }
        />
      ) : tasks.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="Inbox Empty"
          description="No tasks waiting to be processed."
          actions={
            <ActionPanel>
              <Action
                title="Add Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={handleAddTask}
              />
              <Action
                title="Open Pinwork"
                icon={Icon.ArrowNe}
                onAction={handleOpenInbox}
              />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={handleRetry}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Inbox"
          subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
        >
          {tasks.map((task) => (
            <TaskListItem
              key={task.id}
              task={task}
              onTaskUpdated={revalidate}
              mutateTasks={mutate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
