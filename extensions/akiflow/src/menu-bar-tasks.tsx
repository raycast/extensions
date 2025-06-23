import { useEffect, useState } from "react";
import { getPreferenceValues, Icon, MenuBarExtra } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Akiflow, viewTaskInAkiflow } from "../utils/akiflow";

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
}

interface ReturnedTasks {
  data: Task[];
}

function TaskMenuItemsSection({
  title,
  tasks,
  projects,
}: {
  title: string;
  tasks: Task[];
  projects: { [key: string]: { title: string } };
}) {
  return (
    <MenuBarExtra.Section title={title}>
      {tasks.map((task) => (
        <MenuBarExtra.Item
          key={task.id}
          title={task.title}
          subtitle={task.listId ? projects[task.listId].title : ""}
          icon={task.done ? Icon.Checkmark : Icon.Circle}
          onAction={() => {
            viewTaskInAkiflow(task.title);
          }}
        />
      ))}
    </MenuBarExtra.Section>
  );
}

export default function Command() {
  const [tasks, setTasks] = useState<ReturnedTasks>({ data: [] });
  const [projects, setProjects] = useCachedState<{
    [key: string]: { title: string; color: string; parentId: string | null; icon: string };
  }>("projects", {});
  // const [tags, setTags] = useCachedState<{ [key: string]: string }>("tags", {});
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state

  useEffect(() => {
    const akiflow = new Akiflow(getPreferenceValues<Preferences>().refreshToken);
    const fetchTasks = async () => {
      try {
        const fetchedTasks = await akiflow.getTasks();
        setTasks(fetchedTasks); // Set tasks using useState
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false); // Set loading to false after fetching
      }
    };
    fetchTasks();
  }, []); // Empty dependency array to run only once on mount

  useEffect(() => {
    const akiflow = new Akiflow(getPreferenceValues<Preferences>().refreshToken);

    const fetchProjectsAndTags = async () => {
      try {
        await akiflow.projectsPromise; // Wait for the projects to be fetched
        setProjects(akiflow.projects); // Set the projects state
        // Menu bar tasks doesn't use tags actually so its commented out
        // await akiflow.refreshTags(); // Fetch tags
        // setTags(akiflow.tags); // Set the tags state
      } catch (error) {
        console.error("Error fetching projects or tags", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectsAndTags();
  }, []);

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
          : new Date(Infinity); // Far future date

    const dateB = b.date
      ? new Date(b.date)
      : b.datetime
        ? new Date(b.datetime)
        : b.due_date
          ? new Date(b.due_date)
          : new Date(Infinity); // Far future date

    return dateA.getTime() - dateB.getTime(); // Ascending order
  });

  const inboxTasks = notWeirdBrokenTasks.filter((task) => task.status === 1 && task.done === false);
  const date = new Date();
  const formattedDate = date.toLocaleDateString("en-CA"); // 'en-CA' is for Canadian English which uses YYYY-MM-DD format
  const todayTasks = notWeirdBrokenTasks.filter((task) => task.status === 2 && formattedDate === task.date);
  return (
    <MenuBarExtra icon={{ source: Icon.CheckList }} isLoading={isLoading}>
      <TaskMenuItemsSection title="Inbox Tasks" tasks={inboxTasks} projects={projects} />
      <TaskMenuItemsSection title="Today's Tasks" tasks={todayTasks} projects={projects} />
    </MenuBarExtra>
  );
}
