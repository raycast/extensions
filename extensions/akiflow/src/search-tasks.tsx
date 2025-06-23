import { ActionPanel, Action, Icon, List, getPreferenceValues, Color, showToast, Toast } from "@raycast/api";
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
  const [tasks, setTasks] = useCachedState<ReturnedTasks>("tasks", { data: [] });
  const [projects, setProjects] = useCachedState<{ [key: string]: Project }>("projects", {});
  const [tags, setTags] = useCachedState<{ [key: string]: string }>("tags", {});
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state
  const refreshToken = getPreferenceValues<Preferences>().refreshToken;

  useEffect(() => {
    const akiflow = new Akiflow(getPreferenceValues<Preferences>().refreshToken);
    const fetchTasks = async () => {
      try {
        const tasks = await akiflow.getTasks();
        setTasks(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false); // Set loading to false after fetching
      }
    };
    fetchTasks();
  }, []); // Empty dependency array to run only once on mount
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectsAndTags();
  }, [refreshToken]);

  const notDeletedTasks = tasks.data.filter((task: Task) => task.deleted_at === null && task.trashed_at === null);
  const notRecurringTasks = notDeletedTasks.filter((task) => task.recurrence === null && task.recurring_id === null);
  const notWeirdBrokenTasks = notRecurringTasks.filter((task) => [1, 2, 4, 7].includes(task.status));
  notWeirdBrokenTasks.sort((a, b) => {
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
  const sortedTasksOnSomeday = notWeirdBrokenTasks.sort((a, b) => {
    // Move tasks with status 7 to the end
    if (a.status === 7 && b.status !== 7) return 1;
    if (a.status !== 7 && b.status === 7) return -1;
    return 0; // Keep original order for other tasks
  });
  const notDoneTasks = sortedTasksOnSomeday.filter((task) => !task.done);
  const doneTasks = sortedTasksOnSomeday.filter((task) => task.done);
  const sortedDoneTasks = doneTasks.sort((a, b) => {
    const dateA = a.done_at ? new Date(a.done_at) : new Date(Infinity);
    const dateB = b.done_at ? new Date(b.done_at) : new Date(Infinity);
    return dateA.getTime() - dateB.getTime();
  });
  sortedDoneTasks.reverse(); // reverse the order of done tasks so most recently done is at the top

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
              ...(task.tagsIds ? task.tagsIds.map((tagId) => tags[tagId]) : []),
              ...(task.listId ? [projects[task.listId].title] : []),
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
                  value: task.listId ? projects[task.listId].icon + " " + projects[task.listId].title : "",
                  // value: "listId",
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
    >
      <TaskListSection
        title="Not Done"
        tasks={notDoneTasks.sort((a, b) => {
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
        })}
      />
      {getPreferenceValues<Preferences.SearchTasks>().showCompletedTasks && (
        <TaskListSection title="Done" tasks={sortedDoneTasks} />
      )}
    </List>
  );
}
