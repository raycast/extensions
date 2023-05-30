import { Action, ActionPanel, Icon, List } from "@raycast/api";

import CreateTask from "../create-task";
import { ViewMode } from "../helpers/tasks";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import TaskListSections from "./TaskListSections";

function Project({ projectId }: { projectId: string }) {
  const [data] = useCachedData();

  const project = data?.projects.find((project) => project.id === projectId);

  // Don't show sub-tasks in project view
  const tasks = data?.items.filter((task) => task.project_id === projectId && task.parent_id === null) ?? [];
  const allSections = data?.sections.filter((section) => section.project_id === projectId);

  let sections = [];

  const {
    sections: groupedSections,
    viewProps,
    sortedTasks,
  } = useViewTasks(`todoist.project${projectId}`, {
    tasks,
    optionsToExclude: ["project"],
    data,
  });

  if (viewProps.groupBy?.value === "default") {
    sections = [
      {
        name: "No section",
        tasks: sortedTasks?.filter((task) => !task.section_id) || [],
      },
    ];

    if (allSections && allSections.length > 0) {
      sections.push(
        ...allSections.map((section) => ({
          name: section.name,
          tasks: sortedTasks?.filter((task) => task.section_id === section.id) || [],
        }))
      );
    }
  } else {
    sections = groupedSections;
  }

  return (
    <List navigationTitle={project?.name} searchBarPlaceholder="Filter tasks by name, priority, label, or assignee">
      <TaskListSections mode={ViewMode.project} sections={sections} viewProps={viewProps} />

      <List.EmptyView
        title={`You don't have any tasks in ${project?.name}.`}
        description="How about adding one?"
        actions={
          <ActionPanel>
            <Action.Push
              title={`Create Task in ${project?.name}`}
              icon={Icon.Plus}
              target={<CreateTask fromProjectId={projectId} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default Project;
