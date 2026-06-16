/**
 * Show Next command - displays upcoming tasks from Pinwork.
 * Shows tasks scheduled for the near future.
 */

import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { openView } from "./api/pinwork";
import { TaskListItem } from "./components";
import { usePinworkAvailability } from "./hooks/usePinworkAvailability";
import { useNextTasks } from "./hooks/useNextTasks";
import { isTomorrow, isThisWeek } from "date-fns";

export default function ShowNextCommand() {
  const availability = usePinworkAvailability();
  const { tasks, isLoading, error, revalidate, mutate } = useNextTasks({
    execute: availability.isReady,
  });

  const isBusy = availability.isLoading || isLoading;

  // Group tasks by time period
  const tomorrowTasks = tasks.filter(
    (task) => task.scheduledDate && isTomorrow(task.scheduledDate),
  );
  const thisWeekTasks = tasks.filter(
    (task) =>
      task.scheduledDate &&
      !isTomorrow(task.scheduledDate) &&
      isThisWeek(task.scheduledDate, { weekStartsOn: 1 }),
  );
  const laterTasks = tasks.filter(
    (task) =>
      task.scheduledDate &&
      !isTomorrow(task.scheduledDate) &&
      !isThisWeek(task.scheduledDate, { weekStartsOn: 1 }),
  );

  async function handleOpenNext() {
    await openView("next");
  }

  async function handleRetry() {
    await availability.revalidate();
    await revalidate();
  }

  return (
    <List
      isLoading={isBusy}
      searchBarPlaceholder="Filter upcoming tasks..."
      navigationTitle="Next"
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
              <Action title="Open Pinwork" onAction={handleOpenNext} />
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
          icon={Icon.Calendar}
          title="Nothing Coming Up"
          description="No tasks scheduled for the next two weeks."
          actions={
            <ActionPanel>
              <Action
                title="Open Pinwork"
                icon={Icon.ArrowNe}
                onAction={handleOpenNext}
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
          {tomorrowTasks.length > 0 && (
            <List.Section
              title="Tomorrow"
              subtitle={`${tomorrowTasks.length} task${
                tomorrowTasks.length === 1 ? "" : "s"
              }`}
            >
              {tomorrowTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={revalidate}
                  mutateTasks={mutate}
                />
              ))}
            </List.Section>
          )}

          {thisWeekTasks.length > 0 && (
            <List.Section
              title="This Week"
              subtitle={`${thisWeekTasks.length} task${
                thisWeekTasks.length === 1 ? "" : "s"
              }`}
            >
              {thisWeekTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={revalidate}
                  mutateTasks={mutate}
                />
              ))}
            </List.Section>
          )}

          {laterTasks.length > 0 && (
            <List.Section
              title="Later"
              subtitle={`${laterTasks.length} task${
                laterTasks.length === 1 ? "" : "s"
              }`}
            >
              {laterTasks.map((task) => (
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
