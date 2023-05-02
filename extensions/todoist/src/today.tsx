import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

import { todoist, handleError } from "./api";
import TaskList from "./components/TaskList";
import View from "./components/View";
import {
  getSectionsWithProjects,
  GroupByOption,
  partitionTasksWithOverdue,
  SectionWithTasks,
  todayGroupByOptions,
} from "./helpers/groupBy";
import { getSectionsWithPriorities, getSectionsWithLabels } from "./helpers/sections";

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

  switch (groupBy) {
    case "default": {
      const [overdue, today] = partitionTasksWithOverdue(tasks || []);

      sections = [{ name: "Today", tasks: today }];

      if (overdue.length > 0) {
        sections.unshift({
          name: "Overdue",
          tasks: overdue,
        });
      }
      break;
    }
    case "priority":
      sections = getSectionsWithPriorities(tasks || []);
      break;
    case "project":
      sections = getSectionsWithProjects({ tasks: tasks || [], projects: projects || [] });
      break;
    case "label":
      sections = getSectionsWithLabels({ tasks: tasks || [], labels: labels || [] });
      break;
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
