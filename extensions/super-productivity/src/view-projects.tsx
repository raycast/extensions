import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Color,
} from "@raycast/api";
import { getProjects, getTasks, startTask, updateTask } from "./api";
import type { Project, Task } from "./types";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  async function fetchProjects() {
    setIsLoading(true);
    try {
      const fetched = await getProjects();
      setProjects(fetched);
    } catch (e) {
      console.error("Failed to fetch projects:", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjectTasks(projectId: string) {
    setTasksLoading(true);
    try {
      const tasks = await getTasks({ projectId, source: "active" });
      setProjectTasks(tasks);
    } catch (e) {
      console.error("Failed to fetch project tasks:", e);
    } finally {
      setTasksLoading(false);
    }
  }

  async function handleSelectProject(project: Project) {
    setSelectedProject(project);
    fetchProjectTasks(project.id);
  }

  async function handleStartTask(taskId: string) {
    try {
      await startTask(taskId);
      await showToast({ style: Toast.Style.Success, title: "Task started" });
    } catch (e) {
      console.error("Failed to start task:", e);
    }
  }

  async function handleCompleteTask(task: Task) {
    try {
      await updateTask(task.id, { isDone: true });
      if (selectedProject) fetchProjectTasks(selectedProject.id);
    } catch (e) {
      console.error("Failed to complete task:", e);
    }
  }

  if (selectedProject) {
    return (
      <List
        isLoading={tasksLoading}
        navigationTitle={`${selectedProject.title} — Tasks`}
        searchBarPlaceholder={`Search tasks in ${selectedProject.title}...`}
      >
        {projectTasks.map((task) => {
          const timeEstimate =
            task.timeEstimate > 0 ? `${task.timeEstimate / 3600000}h` : "";
          return (
            <List.Item
              key={task.id}
              title={task.title}
              keywords={[task.title]}
              accessories={[
                ...(timeEstimate
                  ? [{ text: timeEstimate, icon: Icon.Clock }]
                  : []),
                ...(task.dueDay
                  ? [{ text: task.dueDay.slice(0, 10), icon: Icon.Calendar }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={
                        task.timeSpent > 0
                          ? `Resume Tracking (${(task.timeSpent / 3600000).toFixed(1)}h spent)`
                          : "Start Tracking"
                      }
                      icon={
                        task.timeSpent > 0 ? Icon.ArrowClockwise : Icon.Play
                      }
                      onAction={() => handleStartTask(task.id)}
                    />
                    <Action
                      title="Mark Complete"
                      icon={Icon.CheckCircle}
                      onAction={() => handleCompleteTask(task)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Back to Projects"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd"], key: "[" }}
                      onAction={() => setSelectedProject(null)}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={() => fetchProjectTasks(selectedProject.id)}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
        {!tasksLoading && projectTasks.length === 0 && (
          <List.EmptyView
            icon={Icon.Folder}
            title="No tasks in this project"
            description={`"${selectedProject.title}" has no active tasks.`}
          />
        )}
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Projects"
      searchBarPlaceholder="Search projects..."
    >
      {projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.title}
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="View Tasks"
                icon={Icon.List}
                onAction={() => handleSelectProject(project)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={fetchProjects}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && projects.length === 0 && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No projects found"
          description="Create projects in Super Productivity first."
        />
      )}
    </List>
  );
}
