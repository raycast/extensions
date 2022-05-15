import useSWR from "swr";
import TaskList from "./components/TaskList";
import { getSectionsWithDueDates } from "./helpers";
import { handleError, todoist } from "./api";
import { SWRKeys } from "./types";

export default function Upcoming() {
  const { data, error } = useSWR(SWRKeys.tasks, () => todoist.getTasks({ filter: "view all" }));
  const { data: projects, error: getProjectsError } = useSWR(SWRKeys.projects, () => todoist.getProjects());

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get tasks" });
  }

  if (error) {
    handleError({ error, title: "Unable to get tasks" });
  }

  const tasks = data?.filter((task) => task.due?.date) || [];
  const sections = getSectionsWithDueDates(tasks);

  return <TaskList sections={sections} isLoading={!data && !error} projects={projects} />;
}
