import { Action, ActionPanel, List, showToast, Toast, Icon, Color } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { getTasks, formatTasksForGoogleSheets, formatDayTasksForGoogleSheets, deleteTask } from "./utils";

// Simple date formatting functions
function formatDate(date: Date, format: string): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  switch (format) {
    case "EEEE, MMMM d, yyyy":
      return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    case "MMMM d, yyyy":
      return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    default:
      return date.toISOString();
  }
}

function parseISODate(dateString: string): Date {
  return new Date(dateString + "T00:00:00.000Z");
}

export default function Command() {
  const {
    data: tasks = {},
    isLoading,
    revalidate,
  } = useCachedPromise(getTasks, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Failed to fetch tasks" });
    },
  });

  const sortedDates = Object.keys(tasks).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const totalTasks = sortedDates.reduce((sum, date) => sum + tasks[date].length, 0);

  return (
    <List isLoading={isLoading} navigationTitle="Done Tasks By Day" searchBarPlaceholder="Search tasks by date...">
      {sortedDates.length > 0 && (
        <List.Section title={`${totalTasks} Total Tasks`}>
          {sortedDates.map((date) => {
            const taskCount = tasks[date].length;
            const formattedDate = formatDate(parseISODate(date), "EEEE, MMMM d, yyyy");

            return (
              <List.Item
                key={date}
                title={formattedDate}
                subtitle={`${taskCount} task${taskCount !== 1 ? "s" : ""}`}
                icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                accessories={[{ text: `${taskCount}`, icon: Icon.CheckCircle }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="View">
                      <Action.Push
                        title="View Tasks"
                        icon={Icon.List}
                        target={<DailyTasksList date={date} tasks={tasks[date]} onTasksChange={revalidate} />}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy Day Tasks (Google Sheets Format)"
                        icon={Icon.CopyClipboard}
                        content={formatDayTasksForGoogleSheets(date, tasks[date])}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        onCopy={() => {
                          showToast({
                            style: Toast.Style.Success,
                            title: "Copied to Clipboard",
                            message: `${taskCount} task${taskCount !== 1 ? "s" : ""} ready for Google Sheets`,
                          });
                        }}
                      />
                      <Action.CopyToClipboard
                        title="Copy All Tasks (Google Sheets Format)"
                        icon={Icon.Document}
                        content={formatTasksForGoogleSheets(tasks)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        onCopy={() => {
                          showToast({
                            style: Toast.Style.Success,
                            title: "Copied All Tasks",
                            message: `${totalTasks} tasks ready for Google Sheets`,
                          });
                        }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {sortedDates.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="No Tasks Yet"
          description="Use 'Log Done Task' to start tracking your completed tasks"
        />
      )}
    </List>
  );
}

// This is the component for the detailed view of a single day
function DailyTasksList({ date, tasks, onTasksChange }: { date: string; tasks: string[]; onTasksChange: () => void }) {
  const formattedDate = formatDate(parseISODate(date), "MMMM d, yyyy");
  const taskCount = tasks.length;

  async function handleDeleteTask(taskIndex: number) {
    try {
      await deleteTask(date, taskIndex);
      await showToast({
        style: Toast.Style.Success,
        title: "Task Deleted",
      });
      onTasksChange();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete task" });
    }
  }

  return (
    <List navigationTitle={`Tasks for ${formattedDate}`} searchBarPlaceholder="Search tasks...">
      <List.Section title={`${taskCount} Task${taskCount !== 1 ? "s" : ""}`}>
        {tasks.map((task, index) => (
          <List.Item
            key={index}
            title={task}
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            accessories={[{ text: `#${index + 1}` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Task"
                    icon={Icon.CopyClipboard}
                    content={task}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy with Date (Google Sheets Format)"
                    icon={Icon.Document}
                    content={`${date}\t${task}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onCopy={() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Copied with Date",
                        message: "Ready to paste in Google Sheets",
                      });
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy All Tasks (Google Sheets Format)"
                    icon={Icon.List}
                    content={formatDayTasksForGoogleSheets(date, tasks)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    onCopy={() => {
                      showToast({
                        style: Toast.Style.Success,
                        title: "Copied All Tasks",
                        message: `${taskCount} tasks ready for Google Sheets`,
                      });
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Manage">
                  <Action
                    title="Delete Task"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDeleteTask(index)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
