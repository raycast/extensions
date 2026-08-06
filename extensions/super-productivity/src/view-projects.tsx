import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { getProjects, getTasks, startTask, updateTask } from "./api";
import type { Project, Task } from "./types";

function ProjectTasks({ project }: { project: Project }) {
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  async function fetchProjectTasks() {
    setIsLoading(true);
    setHasError(false);
    try {
      const tasks = await getTasks({ projectId: project.id, source: "active" });
      setProjectTasks(tasks);
    } catch (e) {
      console.error("Failed to fetch project tasks:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchProjectTasks();
  }, []);

  async function handleStartTask(taskId: string) {
    try {
      await startTask(taskId);
      await fetchProjectTasks();
    } catch (e) {
      console.error("Failed to start task:", e);
    }
  }

  async function handleCompleteTask(task: Task) {
    try {
      await updateTask(task.id, { isDone: true });
      await fetchProjectTasks();
    } catch (e) {
      console.error("Failed to complete task:", e);
    }
  }

  if (hasError) {
    return (
      <List isLoading={isLoading} navigationTitle={`${project.title} Tasks`}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load project tasks"
          description="Make sure Super Productivity is running and its Local REST API is enabled."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${project.title} Tasks`}
      searchBarPlaceholder={`Search tasks in ${project.title}...`}
    >
      {projectTasks.map((task) => {
        const timeEstimate = task.timeEstimate > 0 ? `${task.timeEstimate / 3600000}h` : "";
        return (
          <List.Item
            key={task.id}
            title={task.title}
            keywords={[task.title]}
            accessories={[
              ...(timeEstimate ? [{ text: timeEstimate, icon: Icon.Clock }] : []),
              ...(task.dueDay ? [{ text: task.dueDay.slice(0, 10), icon: Icon.Calendar }] : []),
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
                    icon={task.timeSpent > 0 ? Icon.ArrowClockwise : Icon.Play}
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
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchProjectTasks}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && projectTasks.length === 0 && (
        <List.EmptyView
          icon={Icon.Folder}
          title="No tasks in this project"
          description={`"${project.title}" has no active tasks.`}
        />
      )}
    </List>
  );
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  async function fetchProjects() {
    setIsLoading(true);
    setHasError(false);
    try {
      const fetched = await getProjects();
      setProjects(fetched);
    } catch (e) {
      console.error("Failed to fetch projects:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  if (hasError) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load projects"
          description="Make sure Super Productivity is running and its Local REST API is enabled."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.map((project) => (
        <List.Item
          key={project.id}
          title={project.title}
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.Push title="View Tasks" icon={Icon.List} target={<ProjectTasks project={project} />} />
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
