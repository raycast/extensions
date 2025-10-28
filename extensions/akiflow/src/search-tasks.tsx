import { ActionPanel, Action, Icon, List, getPreferenceValues, Color, showToast, Toast, Clipboard } from "@raycast/api";
import { Akiflow, viewTaskInAkiflow } from "../utils/akiflow";
import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";

interface ReturnedTasks {
  data: Task[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  datetime: string | null;
  duration: number;
  priority: number;
  listId: string | null;
  done: boolean;
  status: number;
  due_date: string | null;
  tagsIds: string[] | null;
  deleted_at?: string | null;
  trashed_at?: string | null;
  recurrence: string | null;
  recurring_id: string | null;
  links: string[] | null;
  done_at: string | null;
  content: Record<string, unknown>;
}

interface Priority {
  stringRepresentation: string;
  color: Color | undefined;
  icon: Icon;
}

interface Project {
  title: string;
  color: string;
  parentId: string | null;
  icon: string;
}

const priorityMap: Record<number, Priority> = {
  1: { stringRepresentation: "High", color: Color.Red, icon: Icon.Exclamationmark3 },
  2: { stringRepresentation: "Medium", color: Color.Yellow, icon: Icon.Exclamationmark2 },
  3: { stringRepresentation: "Low", color: Color.Green, icon: Icon.Exclamationmark },
  99: { stringRepresentation: "No Priority", color: undefined, icon: Icon.Flag },
  [-1]: { stringRepresentation: "Goal", color: Color.Magenta, icon: Icon.BullsEye },
};

function formatDate(task: Task): [string, boolean] {
  if (task.date) {
    return [new Date(task.date).toLocaleDateString("en-US", { timeZone: "UTC" }), false];
  } else if (task.datetime) {
    return [new Date(task.datetime).toLocaleDateString("en-US", { timeZone: "UTC" }), false];
  } else if (task.due_date) {
    return [new Date(task.due_date).toLocaleDateString("en-US", { timeZone: "UTC" }), true];
  } else {
    return ["", false];
  }
}

async function markTaskAsDone(taskId: string) {
  const akiflow = new Akiflow(getPreferenceValues<Preferences>().refreshToken);
  try {
    showToast({ title: "Marking task as done...", style: Toast.Style.Animated });
    await akiflow.markTaskAsDone(taskId);
    showToast({ title: "Task marked as done", style: Toast.Style.Success });
  } catch (error) {
    const errorMessage = (error as Error).message;
    showToast({ title: "Error marking task as done", message: errorMessage, style: Toast.Style.Failure });
    console.error("Error marking task as done:", error);
  }
}

export default function Command() {
  const [tasks, setTasks] = useState<ReturnedTasks>({ data: [] });
  const [projects, setProjects] = useCachedState<{ [key: string]: Project }>("projects", {});
  const [tags, setTags] = useCachedState<{ [key: string]: string }>("tags", {});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>("");
  const refreshToken = getPreferenceValues<Preferences>().refreshToken;

  const fetchFreshTasks = async (query?: string) => {
    setIsLoading(true);

    const akiflow = new Akiflow(refreshToken);
    try {
      const freshTasks = await akiflow.getTasks(false, query);
      setTasks(freshTasks);
      if (!query) {
        showToast({ title: "Tasks refreshed", style: Toast.Style.Success });
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      showToast({ title: "Error fetching tasks", message: (error as Error).message, style: Toast.Style.Failure });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFreshTasks();
  }, [refreshToken]); // Fetch when refresh token changes

  // Trigger API search when user types 3+ characters
  useEffect(() => {
    if (searchText.length >= 3) {
      const timer = setTimeout(() => {
        fetchFreshTasks(searchText);
      }, 500); // Debounce 500ms to avoid too many API calls

      return () => clearTimeout(timer);
    } else if (searchText.length === 0) {
      // Reset to show all tasks when search is cleared
      fetchFreshTasks();
    }
  }, [searchText]);

  useEffect(() => {
    const akiflow = new Akiflow(refreshToken);

    const fetchProjectsAndTags = async () => {
      try {
        await akiflow.projectsPromise;
        setProjects(akiflow.projects);
        await akiflow.refreshTags();
        setTags(akiflow.tags);
      } catch (error) {
        console.error("Error fetching projects or tags", error);
      }
    };

    fetchProjectsAndTags();
  }, [refreshToken]);

  // Filter deleted/trashed only - show all active tasks
  const baseTasks = tasks.data.filter((task: Task) => {
    // Remove deleted/trashed
    if (task.deleted_at != null || task.trashed_at != null) return false;
    return true;
  });

  // Smart deduplication: Group by TITLE first, then handle recurring logic within each title group
  const titleGroups = new Map<string, Task[]>();

  baseTasks.forEach((task: Task) => {
    const group = titleGroups.get(task.title) || [];
    group.push(task);
    titleGroups.set(task.title, group);
  });

  // For each title group, deduplicate
  const selectedTasks: Task[] = [];
  titleGroups.forEach((tasks) => {
    // If only one task with this title, always include it
    if (tasks.length === 1) {
      selectedTasks.push(tasks[0]);
      return;
    }

    // Multiple tasks with same title - deduplicate
    const notDoneTasks = tasks.filter((t) => !t.done);
    const doneTasks = tasks.filter((t) => t.done);

    // For not-done tasks, only keep the NEXT (earliest) one
    if (notDoneTasks.length > 0) {
      const earliest = notDoneTasks.reduce((prev, curr) => {
        const prevDate = new Date(prev.datetime || prev.date || 0);
        const currDate = new Date(curr.datetime || curr.date || 0);
        return currDate < prevDate ? curr : prev;
      });
      selectedTasks.push(earliest);
    }

    // For done tasks, only keep the most recent one
    if (doneTasks.length > 0) {
      const mostRecent = doneTasks.reduce((prev, curr) => {
        const prevDate = new Date(prev.done_at || prev.datetime || prev.date || 0);
        const currDate = new Date(curr.done_at || curr.datetime || curr.date || 0);
        return currDate > prevDate ? curr : prev;
      });
      selectedTasks.push(mostRecent);
    }
  });

  const finalTasks = selectedTasks;

  // Debug: Check for duplicate task IDs or titles in completed tasks
  const completedTasksRaw = finalTasks.filter((task) => task.done === true);
  const titleCounts = new Map<string, number>();
  completedTasksRaw.forEach((t) => {
    const count = titleCounts.get(t.title) || 0;
    titleCounts.set(t.title, count + 1);
  });
  const duplicateTitles = Array.from(titleCounts.entries()).filter(([, count]) => count > 1);
  if (duplicateTitles.length > 0) {
    let debugInfo = "=== DUPLICATE TASKS DEBUG ===\n\n";
    debugInfo += `Found ${duplicateTitles.length} tasks with duplicates:\n\n`;

    duplicateTitles.forEach(([title, count]) => {
      const dupes = completedTasksRaw.filter((t) => t.title === title);
      debugInfo += `"${title}" (${count} instances):\n`;
      dupes.forEach((d) => {
        debugInfo += `  - ID: ${d.id}\n`;
        debugInfo += `    recurring_id: ${d.recurring_id || "none"}\n`;
        debugInfo += `    done_at: ${d.done_at || "none"}\n`;
        debugInfo += `    date: ${d.date || "none"}\n`;
        debugInfo += `    datetime: ${d.datetime || "none"}\n\n`;
      });
    });

    Clipboard.copy(debugInfo);
    showToast({
      title: `Found ${duplicateTitles.length} duplicate tasks`,
      message: "Debug info copied to clipboard",
      style: Toast.Style.Animated,
    });
  }

  // Split into open and completed tasks
  const openTasks = finalTasks.filter((task) => task.done === false);
  const completedTasks = finalTasks.filter((task) => task.done === true);

  // Sort open tasks by date (earliest first)
  const sortedOpenTasks = openTasks.sort((a, b) => {
    const dateA = a.date
      ? new Date(a.date)
      : a.datetime
        ? new Date(a.datetime)
        : a.due_date
          ? new Date(a.due_date)
          : new Date(Infinity);

    const dateB = b.date
      ? new Date(b.date)
      : b.datetime
        ? new Date(b.datetime)
        : b.due_date
          ? new Date(b.due_date)
          : new Date(Infinity);

    return dateA.getTime() - dateB.getTime();
  });

  // Move Someday tasks to end of open tasks
  const sortedOpenTasksWithSomeday = sortedOpenTasks.sort((a, b) => {
    if (a.status === 7 && b.status !== 7) return 1;
    if (a.status !== 7 && b.status === 7) return -1;
    return 0;
  });

  // Sort completed tasks by completion date (most recent first) and limit
  const sortedCompletedTasks = completedTasks
    .sort((a, b) => {
      const dateA = a.done_at ? new Date(a.done_at) : new Date(0);
      const dateB = b.done_at ? new Date(b.done_at) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 200);

  function TaskListSection({ title, tasks }: { title: string; tasks: Task[] }) {
    return (
      <List.Section title={title}>
        {tasks.map((task) => (
          <List.Item
            key={task.id}
            title={task.title}
            // title="title"
            keywords={[
              ...(task.status == 1 && task.done == false ? ["inbox"] : []),
              ...(task.status == 2 ? ["planned"] : []),
              ...(task.status == 4 ? ["snoozed"] : []),
              ...(task.status == 7 ? ["someday"] : []),
              ...(task.priority == -1 ? ["goal priority"] : []),
              ...(task.priority == 1 ? ["high priority"] : []),
              ...(task.priority == 2 ? ["medium priority"] : []),
              ...(task.priority == 3 ? ["low priority"] : []),
              ...(task.priority == 99 || task.priority == null ? ["no priority"] : []),
              ...(task.tagsIds ? task.tagsIds.map((tagId) => tags[tagId]).filter(Boolean) : []),
              ...(task.listId && projects[task.listId] ? [projects[task.listId].title] : []),
              ...(task.date ? [formatDate(task)[0]] : []),
              ...(task.datetime ? [formatDate(task)[0]] : []),
              ...(task.due_date ? [formatDate(task)[0]] : []),
            ]}
            accessories={[
              {
                text: {
                  value: task.status == 1 ? "Inbox" : task.status == 7 ? "Someday" : "",
                  color: task.status == 1 ? Color.Blue : task.status == 7 ? Color.Orange : undefined,
                },
                icon: {
                  source: task.status == 1 ? Icon.Tray : task.status == 7 ? Icon.Calendar : "",
                  tintColor: task.status == 1 ? Color.Blue : task.status == 7 ? Color.Orange : undefined,
                },
              },
              {
                text: {
                  value:
                    task.listId && projects[task.listId]
                      ? projects[task.listId].icon + " " + projects[task.listId].title
                      : "",
                },
              },
              {
                text: {
                  value: formatDate(task)[0],
                  color: formatDate(task)[1] ? Color.Red : undefined,
                },
                icon: {
                  source: Icon.Calendar,
                  tintColor: formatDate(task)[1] ? Color.Red : undefined,
                },
                tooltip: formatDate(task)[0] ? (formatDate(task)[1] ? "Deadline" : "Planned Date") : "No Date",
              },
              {
                icon: {
                  source:
                    priorityMap[task.priority] &&
                    getPreferenceValues<Preferences.SearchTasks>().useFlagsForPriority == "useBullseye"
                      ? priorityMap[task.priority].icon
                      : Icon.Flag,
                  tintColor: priorityMap[task.priority] ? priorityMap[task.priority].color : undefined,
                },
                tooltip: priorityMap[task.priority] ? priorityMap[task.priority].stringRepresentation : "No Priority",
              },
            ]}
            icon={task.done ? Icon.Checkmark : Icon.Circle}
            actions={
              <ActionPanel title="Task Actions">
                <Action title={`Open ${task.title} in Akiflow`} onAction={() => viewTaskInAkiflow(task.title)} />
                <Action title={`Mark ${task.title} as Done`} onAction={() => markTaskAsDone(task.id)} />
                {task.links != null && task.links.length > 0 && (
                  <Action.OpenInBrowser title={"Open Associated Link"} url={task.links[0]} />
                )}
                <Action
                  title="Refresh Tasks"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={fetchFreshTasks}
                />
                {/* <Action title="Console.log the task" onAction={() => console.log(task)} /> */}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  return (
    <List
      navigationTitle="Search Tasks"
      searchBarPlaceholder={`Search for a task by title or use keywords like 'inbox', 'low priority', or '${new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}'`}
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
      throttle
    >
      <TaskListSection title="Not Done" tasks={sortedOpenTasksWithSomeday} />
      {getPreferenceValues<Preferences.SearchTasks>().showCompletedTasks && (
        <TaskListSection title="Done" tasks={sortedCompletedTasks} />
      )}
    </List>
  );
}
