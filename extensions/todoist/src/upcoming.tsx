import { useCachedPromise } from "@raycast/utils";
import TaskList from "./components/TaskList";
import { getSectionsWithDueDates } from "./helpers/sections";
import { handleError, todoist } from "./api";
import View from "./components/View";

function Upcoming() {
  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: tasksError,
    mutate: mutateTasks,
  } = useCachedPromise(() => todoist.getTasks({ filter: "all" }));

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useCachedPromise(() => todoist.getProjects());

  if (projectsError) {
    handleError({ error: projectsError, title: "Unable to get projects" });
  }

  if (tasksError) {
    handleError({ error: tasksError, title: "Unable to get tasks" });
  }

  const upcomingTasks = tasks?.filter((task) => task.due?.date) || [];
  const sections = getSectionsWithDueDates(upcomingTasks);

  return (
    <TaskList
      sections={sections}
      isLoading={isLoadingTasks || isLoadingProjects}
      projects={projects}
      mutateTasks={mutateTasks}
    />
  );
}

export default function Command() {
  return (
    <View>
      <Upcoming />
    </View>
  );
}
