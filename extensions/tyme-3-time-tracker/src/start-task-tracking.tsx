import { Action, ActionPanel, Icon, List, closeMainWindow, showHUD, getPreferenceValues } from "@raycast/api";
import { Task, getTasks, startTrackingTask, stopTracking } from "./tasks";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";

function getTaskPath(task: Task): string {
  return [task.category?.name, task.project.name, task.parentTask?.name]
    .filter((segment): segment is string => segment !== undefined)
    .join(" > ");
}

function StartTrackerForTask() {
  // Get all tasks
  const { data: tasks, isLoading: tasksIsLoading } = useCachedPromise(getTasks, [], {
    keepPreviousData: true,
  });

  // Sort by frequency
  const { data: sortedTasks, visitItem: visitTask, resetRanking: resetTaskRanking } = useFrecencySorting(tasks);

  // Handle start tracking
  const handleStartTracking = async (task: Task) => {
    closeMainWindow({ clearRootSearch: true });
    visitTask(task);

    const preferences = getPreferenceValues<Preferences.StartTaskTracking>();

    if (preferences.stopRunningTimers) {
      await stopTracking();
    }

    const successfullyStarted = await startTrackingTask(task.id);
    showHUD(successfullyStarted ? "Started tracking task" : "Could not start tracking task");
  };

  return (
    <List isLoading={tasksIsLoading}>
      {sortedTasks?.map((task) => (
        <List.Item
          key={task.id}
          title={task.name}
          accessories={[{ text: getTaskPath(task) }]}
          keywords={[task.category?.name, task.project.name, task.parentTask?.name].filter(
            (segment): segment is string => segment !== undefined
          )}
          actions={
            <ActionPanel>
              <Action title="Start Tracking" icon={Icon.Stopwatch} onAction={() => handleStartTracking(task)} />
              <Action
                title="Reset Sorting for Task"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => resetTaskRanking(task)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default StartTrackerForTask;
