import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect } from "react";
import { useProjects } from "./hooks/useProjects";
import { useAllTasks, useProjectTasks } from "./hooks/useTasks";
import { TaskListItem } from "./components/TaskListItem";
import { TaskForm } from "./components/TaskForm";
import { Project } from "./types";

function ProjectTaskList({
  project,
  projects,
  onTaskMutated,
}: {
  project: Project;
  projects: Project[];
  onTaskMutated?: () => void;
}) {
  const { tasks, isLoading, revalidate } = useProjectTasks(project.id);
  const activeTasks = tasks.filter((t) => t.status === 0);

  function handleRefresh() {
    revalidate();
    onTaskMutated?.();
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={project.name}
      searchBarPlaceholder={`Search in ${project.name}...`}
    >
      {activeTasks.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{
            source: Icon.Folder,
            tintColor: project.color ?? Color.SecondaryText,
          }}
          title="No tasks in this project"
          description="Create a new task from the action panel"
          actions={
            <ActionPanel>
              <Action.Push
                title="New Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <TaskForm
                    projects={projects}
                    defaultProjectId={project.id}
                    onSubmit={handleRefresh}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}

      {activeTasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          projects={projects}
          onRefresh={handleRefresh}
        />
      ))}
    </List>
  );
}

export default function ProjectsCommand() {
  const { projects, isLoading, error } = useProjects();
  const { tasks, revalidate: revalidateTasks } = useAllTasks();

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
    }
  }, [error]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      navigationTitle="Projects"
    >
      {projects.length === 0 && !isLoading && (
        <List.EmptyView
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          title="No projects found"
          description="Create a project in TickTick to organise your tasks"
        />
      )}

      {projects.map((project) => {
        const taskCount = tasks.filter(
          (t) => t.projectId === project.id && t.status === 0,
        ).length;

        return (
          <List.Item
            key={project.id}
            title={project.name}
            // Use Folder for projects — semantically clearer than List
            icon={{
              source: Icon.Folder,
              tintColor: project.color ?? Color.SecondaryText,
            }}
            accessories={[
              // Task count tag — only show when there are tasks; an empty tag
              // is less useful than no accessory at all.
              ...(taskCount > 0
                ? [
                    {
                      tag: {
                        value: `${taskCount}`,
                        color: Color.SecondaryText,
                      },
                      tooltip: `${taskCount} active task${taskCount !== 1 ? "s" : ""}`,
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Project"
                  icon={Icon.ChevronRight}
                  target={
                    <ProjectTaskList
                      project={project}
                      projects={projects}
                      onTaskMutated={revalidateTasks}
                    />
                  }
                />
                <ActionPanel.Section title="Create">
                  <Action.Push
                    title="New Task in Project"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={
                      <TaskForm
                        projects={projects}
                        defaultProjectId={project.id}
                        onSubmit={revalidateTasks}
                      />
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy & Open">
                  <Action.OpenInBrowser
                    title="Open in Ticktick"
                    icon={Icon.Globe}
                    url={`https://ticktick.com/webapp/#p/${project.id}`}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action
                    title="Copy Project Id"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={async () => {
                      await Clipboard.copy(project.id);
                      await showHUD("Project ID copied");
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
