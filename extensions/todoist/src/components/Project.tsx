import { List, getPreferenceValues, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { partition } from "lodash";
import TaskList from "./TaskList";
import { ViewMode, ProjectGroupBy, SectionWithTasks } from "../types";
import { todoist } from "../api";
import { getSectionsWithPriorities, getSectionsWithDueDates, getSectionsWithLabels } from "../helpers/sections";
import CreateTask from "../create-task";
import { Project as TProject } from "@doist/todoist-api-typescript";

interface ProjectProps {
  project: TProject;
}

function Project({ project }: ProjectProps): JSX.Element {
  const {
    data: tasks,
    isLoading: isLoadingTasks,
    mutate: mutateTasks,
  } = useCachedPromise((projectId) => todoist.getTasks({ projectId }), [project.id]);
  const { data: allSections, isLoading: isLoadingSections } = useCachedPromise(
    (projectId) => todoist.getSections(projectId),
    [project.id]
  );
  const { data: labels, isLoading: isLoadingLabels } = useCachedPromise(() => todoist.getLabels());

  const preferences = getPreferenceValues();

  let sections: SectionWithTasks[] = [];

  if (preferences.projectGroupBy === ProjectGroupBy.default) {
    sections = [
      {
        name: "No section",
        tasks: tasks?.filter((task) => !task.sectionId) || [],
      },
    ];

    if (allSections && allSections.length > 0) {
      sections.push(
        ...allSections.map((section) => ({
          name: section.name,
          tasks: tasks?.filter((task) => task.sectionId === section.id) || [],
        }))
      );
    }
  }

  if (preferences.projectGroupBy === ProjectGroupBy.priority) {
    sections = getSectionsWithPriorities(tasks || []);
  }

  if (preferences.projectGroupBy === ProjectGroupBy.date) {
    const [upcomingTasks, noDueDatesTasks] = partition(tasks, (task) => task.due);

    sections = getSectionsWithDueDates(upcomingTasks);

    sections.push({
      name: "No due date",
      tasks: noDueDatesTasks,
    });
  }

  if (preferences.todayGroupBy === ProjectGroupBy.label) {
    sections = getSectionsWithLabels({ tasks: tasks || [], labels: labels || [] });
  }

  return tasks?.length === 0 ? (
    <List isLoading={isLoadingTasks || isLoadingSections || isLoadingLabels} navigationTitle={project.name}>
      <List.EmptyView
        title="No tasks in this project."
        description="How about creating one?"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Task"
              target={<CreateTask fromProjectId={project.id} mutateTasks={mutateTasks} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel>
        }
      />
    </List>
  ) : (
    <TaskList
      mode={ViewMode.project}
      sections={sections}
      isLoading={!tasks || !allSections}
      mutateTasks={mutateTasks}
    />
  );
}

export default Project;
