import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Projects, Tasks } from "../api/resources";
import {
  formatDate,
  priorityColor,
  priorityLabel,
  taskStatusIcon,
} from "../lib/helpers";
import CreateProject from "../create-project";

/** Projects inside a space; drill into each project's task list. */
export function SpaceProjectsList({
  spaceId,
  spaceName,
}: {
  spaceId: string;
  spaceName: string;
}) {
  const {
    data: projects,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (id: string) => Projects.list({ space_id: id }),
    [spaceId],
    { initialData: [] },
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Projects · ${spaceName}`}
      searchBarPlaceholder="Search projects…"
    >
      <List.EmptyView
        title="No projects in this space"
        icon={Icon.Folder}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Project"
              icon={Icon.Plus}
              target={<CreateProject presetSpaceId={spaceId} />}
              onPop={revalidate}
            />
          </ActionPanel>
        }
      />
      {projects.map((project) => (
        <List.Item
          key={project.id}
          icon={{ source: Icon.Folder, tintColor: Color.Orange }}
          title={project.name}
          accessories={[
            project.kanban_enabled
              ? { icon: Icon.BarChart, tooltip: "Kanban enabled" }
              : {},
            project.end_date ? { text: formatDate(project.end_date) } : {},
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Tasks"
                icon={Icon.CheckCircle}
                target={
                  <ProjectTasksList
                    projectId={project.id}
                    projectName={project.name}
                  />
                }
              />
              <Action.Push
                title="Create Project"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateProject presetSpaceId={spaceId} />}
                onPop={revalidate}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ProjectTasksList({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const { data: tasks, isLoading } = useCachedPromise(
    (id: string) => Tasks.list({ project_id: id }),
    [projectId],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Tasks · ${projectName}`}>
      <List.EmptyView
        title="No tasks in this project"
        icon={Icon.CheckCircle}
      />
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          icon={taskStatusIcon(task.completed)}
          title={task.name}
          accessories={[
            task.priority
              ? {
                  tag: {
                    value: priorityLabel(task.priority),
                    color: priorityColor(task.priority),
                  },
                }
              : {},
            task.due_date ? { text: formatDate(task.due_date) } : {},
          ]}
        />
      ))}
    </List>
  );
}
