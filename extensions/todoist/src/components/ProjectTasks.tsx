import { List, ActionPanel, Action, Icon } from "@raycast/api";

import CreateTask from "../create-task";
import { QuickLinkView, ViewMode } from "../home";
import useCachedData from "../hooks/useCachedData";
import useViewTasks from "../hooks/useViewTasks";

import CreateViewActions from "./CreateViewActions";
import TaskListSections from "./TaskListSections";

type ProjectTasksProps = { projectId: string; quickLinkView?: QuickLinkView };

function ProjectTasks({ projectId, quickLinkView }: ProjectTasksProps) {
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
        })),
      );
    }
  } else {
    sections = groupedSections;
  }

  return (
    <>
      <TaskListSections
        mode={ViewMode.project}
        sections={sections}
        viewProps={viewProps}
        quickLinkView={quickLinkView}
      />

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

            {quickLinkView ? (
              <ActionPanel.Section>
                <CreateViewActions {...quickLinkView} />
              </ActionPanel.Section>
            ) : null}
          </ActionPanel>
        }
      />
    </>
  );
}

export default ProjectTasks;
