/**
 * Show Today command - displays today's tasks from Pinwork.
 */

import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { openView } from "./api/pinwork";
import { TaskListItem } from "./components";
import { usePinworkAvailability } from "./hooks/usePinworkAvailability";
import { useTodayTasks } from "./hooks/useTodayTasks";

export default function ShowTodayCommand() {
  const availability = usePinworkAvailability();
  const { tasks, isLoading, error, revalidate, mutate } = useTodayTasks({
    execute: availability.isReady,
  });

  const isBusy = availability.isLoading || isLoading;

  const activeTasks = tasks.filter((task) => !task.isCompleted);
  const completedTasks = tasks.filter((task) => task.isCompleted);

  async function handleOpenToday() {
    await openView("today");
  }

  async function handleRetry() {
    await availability.revalidate();
    await revalidate();
  }

  return (
    <List
      isLoading={isBusy}
      searchBarPlaceholder="Filter today's tasks..."
      navigationTitle="Today"
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
              <Action title="Open Pinwork" onAction={handleOpenToday} />
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
          icon={Icon.CheckCircle}
          title="All Clear!"
          description="You have no tasks scheduled for today."
          actions={
            <ActionPanel>
              <Action
                title="Open Pinwork"
                icon={Icon.ArrowNe}
                onAction={handleOpenToday}
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
        <>
          {activeTasks.length > 0 && (
            <List.Section
              title="To Do"
              subtitle={`${activeTasks.length} tasks`}
            >
              {activeTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={revalidate}
                  mutateTasks={mutate}
                />
              ))}
            </List.Section>
          )}

          {completedTasks.length > 0 && (
            <List.Section
              title="Completed"
              subtitle={`${completedTasks.length} tasks`}
            >
              {completedTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={revalidate}
                  mutateTasks={mutate}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
