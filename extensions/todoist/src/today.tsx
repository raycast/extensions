import { getPreferenceValues, List } from "@raycast/api";
import useSWR from "swr";
import { partitionTasksWithOverdue, getSectionsWithPriorities, getSectionsWithLabels } from "./helpers";
import { todoist, handleError } from "./api";
import { SectionWithTasks, SWRKeys, TodayGroupBy } from "./types";
import TaskList from "./components/TaskList";

export default function Today() {
  const { data: tasks, error: getTasksError } = useSWR(SWRKeys.tasks, () =>
    todoist.getTasks({ filter: "today|overdue" })
  );
  const { data: projects, error: getProjectsError } = useSWR(SWRKeys.projects, () => todoist.getProjects());
  const { data: labels, error: getLabelsError } = useSWR(SWRKeys.labels, () => todoist.getLabels());

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
      isLoading={(!tasks && !getTasksError) || (!projects && !getProjectsError)}
      projects={projects}
    />
  );
}
