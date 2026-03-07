import { List, showToast, Toast, getPreferenceValues, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { Task, ApiResponse } from "./models/types";
import { TaskListItem } from "./components/TaskListItem";
import { getApiUrl, API_ENDPOINTS, getFetchOptions } from "./utils/api";
import { isBefore } from "date-fns";
import { isOverdue, isToday, isTomorrow, getTodayInLocalTime, isThisWeek } from "./utils/dateUtils";

interface Preferences {
  port: string;
  AuthToken?: string;
}

export default function Command() {
  const { port, AuthToken } = getPreferenceValues<Preferences>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [searchText, setSearchText] = useState("");
  const [vaultNameFromAPI, setVaultNameFromAPI] = useState<string>("");

  async function fetchAllTasks(port: string, authToken?: string): Promise<{ tasks: Task[]; vaultName?: string }> {
    const PAGE_LIMIT = 200;
    let offset = 0;
    let allTasks: Task[] = [];
    let vaultName: string | undefined;

    while (true) {
      const res = await fetch(
        getApiUrl(port, API_ENDPOINTS.tasks, { limit: PAGE_LIMIT, offset }),
        getFetchOptions("GET", undefined, authToken),
      );
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const response = (await res.json()) as ApiResponse;
      if (!response.success) {
        throw new Error(response.error?.message || "Operation failed");
      }
      if (!Array.isArray(response.data?.tasks)) {
        throw new Error("Invalid response format: tasks array not found");
      }
      allTasks = allTasks.concat(response.data.tasks);
      if (response.data.vault?.name) {
        vaultName = response.data.vault.name;
      }
      if (!response.data.pagination?.hasMore) {
        break;
      }
      offset += response.data.pagination.limit;
    }

    return { tasks: allTasks, vaultName };
  }

  useEffect(() => {
    let mounted = true;

    async function loadTasks() {
      try {
        setIsLoading(true);
        const { tasks, vaultName } = await fetchAllTasks(port, AuthToken);
        if (mounted) {
          setTasks(tasks);
          if (vaultName) {
            setVaultNameFromAPI(vaultName);
          }
        }
      } catch (err) {
        if (mounted) {
          const message = err instanceof Error ? err.message : "An error occurred while fetching tasks";
          setError(new Error(`Failed to load tasks: ${message}`));
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load tasks",
            message,
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadTasks();
    return () => {
      mounted = false;
    };
  }, [port]);

  // Filter tasks based on search text
  const filterTasks = (tasks: Task[], searchText: string) => {
    if (!searchText.trim()) return tasks;
    const lowerSearch = searchText.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(lowerSearch) ||
        task.tags.some((tag) => tag.toLowerCase().includes(lowerSearch)) ||
        task.contexts.some((context) => context.toLowerCase().includes(lowerSearch)) ||
        task.projects.some((project) => project.toLowerCase().includes(lowerSearch)) ||
        (task.priority && task.priority.toLowerCase().includes(lowerSearch)),
    );
  };

  // Group tasks by status and due date
  const groupTasks = (tasks: Task[]) => {
    const sortByDueDate = (taskList: Task[]) => {
      return taskList.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1; // Tasks without due date go to end
        if (!b.due) return -1;
        return new Date(a.due).getTime() - new Date(b.due).getTime();
      });
    };

    // Filter tasks first, then group them
    const filteredTasks = filterTasks(tasks, searchText);

    return {
      overdue: sortByDueDate(
        filteredTasks.filter((task) => {
          if (task.status === "done") return false;
          if (!task.due) return false;
          return isOverdue(task.due);
        }),
      ),
      today: sortByDueDate(
        filteredTasks.filter((task) => {
          if (task.status === "done") return false;
          if (!task.due) return false;
          return isToday(task.due) && !isOverdue(task.due);
        }),
      ),
      tomorrow: sortByDueDate(
        filteredTasks.filter((task) => {
          if (task.status === "done") return false;
          if (!task.due) return false;
          return isTomorrow(task.due);
        }),
      ),
      thisWeek: sortByDueDate(
        filteredTasks.filter((task) => {
          if (task.status === "done") return false;
          if (!task.due) return false;
          return isThisWeek(task.due);
        }),
      ),
      remaining: sortByDueDate(
        filteredTasks.filter((task) => {
          if (task.status === "done") return false;
          if (!task.due) return true;
          return (
            !isToday(task.due) &&
            !isTomorrow(task.due) &&
            !isThisWeek(task.due) &&
            !isOverdue(task.due) &&
            isBefore(getTodayInLocalTime(), task.due)
          );
        }),
      ),
      completed: filteredTasks
        .filter((task) => task.status === "done")
        .sort((a, b) => {
          const aDate = a.completedDate ?? a.dateModified;
          const bDate = b.completedDate ?? b.dateModified;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })
        .slice(0, 5),
    };
  };

  const handleTaskUpdated = async () => {
    try {
      const { tasks: nextTasks } = await fetchAllTasks(port, AuthToken);
      setTasks(nextTasks);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh tasks",
        message,
      });
    }
  };

  const grouped = groupTasks(tasks);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by title, tags, contexts, projects or priority..."
      navigationTitle="My TaskNotes"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      enableFiltering={false}
    >
      {error ? (
        <List.EmptyView
          title="Failed to load tasks"
          description={error.message}
          icon={{ source: Icon.ExclamationMark }}
        />
      ) : tasks.length === 0 ? (
        <List.EmptyView
          title="No tasks found"
          description="Create a new task to get started"
          icon={{ source: Icon.Checkmark }}
        />
      ) : (
        <>
          {grouped.overdue.length > 0 && (
            <List.Section title="Overdue" subtitle={`${grouped.overdue.length} reminders`}>
              {grouped.overdue.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={handleTaskUpdated}
                  vaultNameFromAPI={vaultNameFromAPI}
                />
              ))}
            </List.Section>
          )}

          {grouped.today.length > 0 && (
            <List.Section title="Today" subtitle={`${grouped.today.length} reminders`}>
              {grouped.today.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={handleTaskUpdated}
                  vaultNameFromAPI={vaultNameFromAPI}
                />
              ))}
            </List.Section>
          )}

          {grouped.tomorrow.length > 0 && (
            <List.Section title="Tomorrow" subtitle={`${grouped.tomorrow.length} reminders`}>
              {grouped.tomorrow.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={handleTaskUpdated}
                  vaultNameFromAPI={vaultNameFromAPI}
                />
              ))}
            </List.Section>
          )}

          {grouped.thisWeek.length > 0 && (
            <List.Section title="This Week" subtitle={`${grouped.thisWeek.length} reminders`}>
              {grouped.thisWeek.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={handleTaskUpdated}
                  vaultNameFromAPI={vaultNameFromAPI}
                />
              ))}
            </List.Section>
          )}

          {grouped.remaining.length > 0 && (
            <List.Section title="Remaining" subtitle={`${grouped.remaining.length} reminders`}>
              {grouped.remaining.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={handleTaskUpdated}
                  vaultNameFromAPI={vaultNameFromAPI}
                />
              ))}
            </List.Section>
          )}

          {grouped.completed.length > 0 && (
            <List.Section title="Completed" subtitle={`${grouped.completed.length} reminders`}>
              {grouped.completed.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskUpdated={handleTaskUpdated}
                  vaultNameFromAPI={vaultNameFromAPI}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
