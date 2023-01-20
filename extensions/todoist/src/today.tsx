import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

import { todoist, handleError } from "./api";
import TaskList from "./components/TaskList";
import View from "./components/View";
import { GroupByOption, todayGroupByOptions } from "./helpers/groupBy";
import { partitionTasksWithOverdue, getSectionsWithPriorities, getSectionsWithLabels } from "./helpers/sections";
import { SectionWithTasks } from "./types";

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

  if (getTasksError) {
    handleError({ error: getTasksError, title: "Unable to get tasks" });
  }

  if (getProjectsError) {
    handleError({ error: getProjectsError, title: "Unable to get tasks" });
  }

  if (getLabelsError) {
    handleError({ error: getLabelsError, title: "Unable to get labels" });
  }

  const [groupBy, setGroupBy] = useCachedState<GroupByOption>("todoist.todaygroupby", "default");

  let sections: SectionWithTasks[] = [];

  if (groupBy === "default") {
    const [overdue, today] = partitionTasksWithOverdue(tasks || []);

    sections = [{ name: "Today", tasks: today }];

    if (overdue.length > 0) {
      sections.unshift({
        name: "Overdue",
        tasks: overdue,
      });
    }
  }

  if (groupBy === "priority") {
    sections = getSectionsWithPriorities(tasks || []);
  }

  if (groupBy === "project") {
    sections =
      projects?.map((project) => ({
        name: project.name,
        tasks: tasks?.filter((task) => task.projectId === project.id) || [],
      })) || [];
  }

  if (groupBy === "label") {
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
      groupBy={{ value: groupBy, setValue: setGroupBy, options: todayGroupByOptions }}
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
