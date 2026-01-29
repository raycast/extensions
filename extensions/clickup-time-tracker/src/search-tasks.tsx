import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getAuthorizedUser,
  getTasks,
  getCurrentTimeEntry,
  formatDuration,
} from "./api/clickup";
import { Task, TimeEntry } from "./types/clickup";
import { TimerForm } from "./components/TimerForm";

export default function SearchTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [currentTimer, setCurrentTimer] = useState<TimeEntry | null>(null);

  async function loadData() {
    setIsLoading(true);
    try {
      const [user, timer] = await Promise.all([
        getAuthorizedUser(),
        getCurrentTimeEntry(),
      ]);

      setCurrentTimer(timer);
      const userTasks = await getTasks(user.id);
      setTasks(userTasks);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Tasks",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter out completed/done tasks and sort them to bottom if any slip through
  const filteredTasks = tasks
    .filter((task) =>
      task.name.toLowerCase().includes(searchText.toLowerCase()),
    )
    .filter((task) => {
      const status = task.status.status.toLowerCase();
      return (
        !status.includes("done") &&
        !status.includes("complete") &&
        !status.includes("closed")
      );
    });

  const groupedTasks = filteredTasks.reduce(
    (acc, task) => {
      const listName = task.list.name;
      if (!acc[listName]) {
        acc[listName] = [];
      }
      acc[listName].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  function getStatusIcon(status: string): Icon {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("done") || statusLower.includes("complete")) {
      return Icon.CheckCircle;
    }
    if (statusLower.includes("progress") || statusLower.includes("doing")) {
      return Icon.Clock;
    }
    if (statusLower.includes("review")) {
      return Icon.Eye;
    }
    return Icon.Circle;
  }

  function getPriorityIcon(
    priority: Task["priority"],
  ): { icon: Icon; tintColor: Color } | undefined {
    if (!priority) return undefined;

    const priorityMap: Record<string, Color> = {
      urgent: Color.Red,
      high: Color.Orange,
      normal: Color.Yellow,
      low: Color.Blue,
    };

    return {
      icon: Icon.Flag,
      tintColor:
        priorityMap[priority.priority.toLowerCase()] || Color.SecondaryText,
    };
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {currentTimer && (
        <List.Section title="Currently Tracking">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={currentTimer.task?.name || "Unknown Task"}
            subtitle={currentTimer.description}
            accessories={[
              {
                text: formatDuration(parseInt(currentTimer.duration)),
                icon: Icon.Stopwatch,
              },
            ]}
          />
        </List.Section>
      )}

      {Object.entries(groupedTasks).map(([listName, listTasks]) => (
        <List.Section
          key={listName}
          title={listName}
          subtitle={`${listTasks.length} tasks`}
        >
          {listTasks.map((task) => {
            const priorityAccessory = getPriorityIcon(task.priority);
            const accessories = [];

            if (priorityAccessory) {
              accessories.push(priorityAccessory);
            }

            if (task.due_date) {
              const dueDate = new Date(parseInt(task.due_date));
              const isOverdue = dueDate < new Date();
              accessories.push({
                date: dueDate,
                icon: isOverdue
                  ? { source: Icon.Calendar, tintColor: Color.Red }
                  : Icon.Calendar,
              });
            }

            accessories.push({
              tag: { value: task.status.status, color: task.status.color },
            });

            return (
              <List.Item
                key={task.id}
                icon={{
                  source: getStatusIcon(task.status.status),
                  tintColor: task.status.color,
                }}
                title={task.name}
                subtitle={
                  task.folder.name !== "hidden" ? task.folder.name : undefined
                }
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Start Timer"
                      icon={Icon.Play}
                      target={
                        <TimerForm task={task} onTimerStarted={loadData} />
                      }
                    />
                    <Action.OpenInBrowser
                      title="Open in Clickup"
                      url={task.url}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={loadData}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}

      {!isLoading && filteredTasks.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Tasks Found"
          description={
            searchText
              ? "Try a different search term"
              : "No tasks assigned to you"
          }
        />
      )}
    </List>
  );
}
