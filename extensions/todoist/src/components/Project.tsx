import { Project as TProject } from "@doist/todoist-api-typescript";
import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { partition } from "lodash";

import { todoist } from "../api";
import CreateTask from "../create-task";
import { GroupByOption, projectGroupByOptions } from "../helpers/groupBy";
import { getSectionsWithPriorities, getSectionsWithDueDates, getSectionsWithLabels } from "../helpers/sections";
import { ViewMode, SectionWithTasks } from "../types";

import TaskList from "./TaskList";

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

  const [groupBy, setGroupBy] = useCachedState<GroupByOption>("todoist.projectgroupby", "default");

  let sections: SectionWithTasks[] = [];

  if (groupBy === "default") {
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

  if (groupBy === "priority") {
    sections = getSectionsWithPriorities(tasks || []);
  }

  if (groupBy === "date") {
    const [upcomingTasks, noDueDatesTasks] = partition(tasks, (task) => task.due);

    sections = getSectionsWithDueDates(upcomingTasks);

    sections.push({
      name: "No due date",
      tasks: noDueDatesTasks,
    });
  }

  if (groupBy === "label") {
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
      groupBy={{ value: groupBy, setValue: setGroupBy, options: projectGroupByOptions }}
      isLoading={!tasks || !allSections}
      mutateTasks={mutateTasks}
    />
  );
}

export default Project;
