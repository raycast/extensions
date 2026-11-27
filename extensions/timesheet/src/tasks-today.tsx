import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  formatDurationHuman,
  getTaskDurationMs,
  getTodayTasks,
  type Task,
} from "./api";
import { ListErrorView } from "./error-view";

export default function TasksToday() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    getTodayTasks,
    [],
    {
      initialData: [] as Task[],
      failureToastOptions: { title: "Failed to load tasks" },
    },
  );

  const totalDuration = data.reduce(
    (sum, task) => sum + getTaskDurationMs(task),
    0,
  );

  if (error && data.length === 0) {
    return (
      <List>
        <ListErrorView
          error={error}
          what="today's tasks"
          onRetry={revalidate}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search today's tasks...">
      <List.Section
        title="Today's Tasks"
        subtitle={`Total: ${formatDurationHuman(totalDuration)}`}
      >
        {data.length === 0 && !isLoading && (
          <List.Item
            icon={Icon.Clock}
            title="No tasks logged today"
            subtitle="Start a timer to begin tracking"
          />
        )}
        {data.map((task) => {
          const startTime = task.startDateTime
            ? new Date(task.startDateTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--";
          const endTime = task.endDateTime
            ? new Date(task.endDateTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--";

          return (
            <List.Item
              key={task.id}
              icon={{
                source: Icon.Clock,
                tintColor: task.billable ? Color.Green : Color.SecondaryText,
              }}
              title={task.project?.title || "Unknown Project"}
              subtitle={task.description}
              accessories={[
                { text: `${startTime} - ${endTime}` },
                { text: formatDurationHuman(getTaskDurationMs(task)) },
                ...(task.billable
                  ? [{ tag: { value: "$", color: Color.Green } }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Timesheet"
                    url={`https://my.timesheet.io/tasks/show/${task.id}`}
                  />
                  <Action.CopyToClipboard
                    title="Copy Task ID"
                    content={task.id}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
