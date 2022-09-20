import { getPreferenceValues, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { partitionTasksWithOverdue, getSectionsWithPriorities, getSectionsWithLabels } from "./helpers/sections";
import { todoist, handleError } from "./api";
import { SectionWithTasks, TodayGroupBy } from "./types";
import TaskList from "./components/TaskList";
import View from "./components/View";

function Today() {
  const {
    data: tasks,
    isLoading: isLoadingTasks,
    error: getTasksError,
    mutate: mutateTasks,
  } = useCachedPromise(() => todoist.getTasks({ filter: "today|overdue" }));
  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: getProjectsError,
  } = useCachedPromise(() => todoist.getProjects());
  const {
    data: labels,
    isLoading: isLoadingLabels,
    error: getLabelsError,
  } = useCachedPromise(() => todoist.getLabels());

  const preferences = getPreferenceValues();

  if (getTasksError) {
    handleError({ error: getTasksError, title: "Unable to get tasks" });
  }

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get tasks" });
  }

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
  }

  let sections: SectionWithTasks[] = [];

  if (preferences.todayGroupBy === TodayGroupBy.default) {
    const [overdue, today] = partitionTasksWithOverdue(tasks || []);

    sections = [{ name: "Today", tasks: today }];

    if (overdue.length > 0) {
      sections.unshift({
        name: "Overdue",
        tasks: overdue,
      });
    }
  }

  if (preferences.todayGroupBy === TodayGroupBy.priority) {
    sections = getSectionsWithPriorities(tasks || []);
  }

  if (preferences.todayGroupBy === TodayGroupBy.project) {
    sections =
      projects?.map((project) => ({
        name: project.name,
        tasks: tasks?.filter((task) => task.projectId === project.id) || [],
      })) || [];
  }

  if (preferences.todayGroupBy === TodayGroupBy.label) {
    sections = getSectionsWithLabels({ tasks: tasks || [], labels: labels || [] });
  }

  return tasks?.length === 0 ? (
    <List>
      <List.EmptyView title="Congratulations!" description="No tasks left for today." icon="🎉" />
    </List>
  ) : (
    <TaskList
      sections={sections}
      isLoading={isLoadingTasks || isLoadingProjects || isLoadingLabels}
      projects={projects}
      mutateTasks={mutateTasks}
    />
  );
}

export default function Command() {
  return (
    <View>
      <Today />
    </View>
  );
}
