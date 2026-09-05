import { Action, ActionPanel, Color, Icon, List, Keyboard } from "@raycast/api";
import { getProjectUrl } from "./api";
import ProjectTasks from "./components/ProjectTasks";
import TaskForm from "./components/TaskForm";
import { colorHex } from "./helpers/colors";
import { useOpenTasks, useProjects } from "./hooks/useData";

export default function ShowProjects() {
  const { data: projects, isLoading, mutate } = useProjects();
  const { data: tasks, mutate: mutateTasks } = useOpenTasks();

  const sorted = [...(projects ?? [])].sort((a, b) => {
    if (a.is_inbox !== b.is_inbox) return a.is_inbox ? -1 : 1;
    return a.child_order - b.child_order;
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter projects">
      {sorted.map((project) => {
        const openCount = tasks?.filter((task) => task.project_id === project.id).length;
        return (
          <List.Item
            key={project.id}
            title={project.is_inbox ? "Inbox" : project.name}
            icon={project.is_inbox ? Icon.Tray : { source: Icon.CircleFilled, tintColor: colorHex(project.color) }}
            subtitle={openCount !== undefined ? `${openCount} ${openCount === 1 ? "task" : "tasks"}` : undefined}
            accessories={project.is_favorite ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []}
            actions={
              <ActionPanel>
                <Action.Push title="Show Tasks" icon={Icon.List} target={<ProjectTasks project={project} />} />
                <Action.Push
                  title="Create Task in Project"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<TaskForm initialProjectId={project.id} />}
                />
                <Action.OpenInBrowser
                  title="Open in OpenTask"
                  url={getProjectUrl(project.id)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action
                  title="Refresh Data"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => Promise.allSettled([mutate(), mutateTasks()])}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView icon={Icon.Folder} title="No projects" description="Create a project in OpenTask first." />
    </List>
  );
}
