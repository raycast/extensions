import { useState, useEffect, useRef } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color, Alert, confirmAlert } from "@raycast/api";
import { getTasks, getProjects, getTags, startTask, archiveTask, deleteTask, updateTask } from "./api";
import type { Task, Project, Tag } from "./types";
import { getProjectTitle, getTagTitles } from "./utils";

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const requestIdRef = useRef(0);

  async function fetchTasks() {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setHasError(false);
    try {
      const [fetchedTasks, fetchedProjects, fetchedTags] = await Promise.all([
        getTasks({ source: "active" }),
        getProjects(),
        getTags(),
      ]);
      if (requestId === requestIdRef.current) {
        setTasks(fetchedTasks);
        setProjects(fetchedProjects);
        setTags(fetchedTags);
      }
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
      if (requestId === requestIdRef.current) setHasError(true);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function handleStartTask(taskId: string) {
    try {
      await startTask(taskId);
      fetchTasks();
    } catch (e) {
      console.error("Failed to start task:", e);
    }
  }

  async function handleCompleteTask(task: Task) {
    try {
      await updateTask(task.id, { isDone: true });
      fetchTasks();
    } catch (e) {
      console.error("Failed to complete task:", e);
    }
  }

  async function handleArchiveTask(task: Task) {
    if (
      await confirmAlert({
        title: "Archive Task",
        message: `Archive "${task.title}"?`,
        primaryAction: { title: "Archive" },
      })
    ) {
      try {
        await archiveTask(task.id);
        await showToast({ style: Toast.Style.Success, title: "Task archived" });
        fetchTasks();
      } catch (e) {
        console.error("Failed to archive task:", e);
      }
    }
  }

  async function handleDeleteTask(task: Task) {
    if (
      await confirmAlert({
        title: "Delete Task",
        message: `Permanently delete "${task.title}"?`,
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteTask(task.id);
        await showToast({ style: Toast.Style.Success, title: "Task deleted" });
        fetchTasks();
      } catch (e) {
        console.error("Failed to delete task:", e);
      }
    }
  }

  if (hasError) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load tasks"
          description="Make sure Super Productivity is running and its Local REST API is enabled."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by project or tag"
          onChange={async (newValue) => {
            if (newValue === "all") {
              fetchTasks();
            } else if (newValue.startsWith("project:")) {
              const requestId = ++requestIdRef.current;
              const projectId = newValue.slice(8);
              setIsLoading(true);
              setHasError(false);
              try {
                const t = await getTasks({
                  source: "active",
                  projectId,
                });
                if (requestId === requestIdRef.current) setTasks(t);
              } catch (e) {
                console.error("Failed to filter tasks:", e);
                if (requestId === requestIdRef.current) setHasError(true);
              } finally {
                if (requestId === requestIdRef.current) setIsLoading(false);
              }
            } else if (newValue.startsWith("tag:")) {
              const requestId = ++requestIdRef.current;
              const tagId = newValue.slice(4);
              setIsLoading(true);
              setHasError(false);
              try {
                const t = await getTasks({
                  source: "active",
                  tagId,
                });
                if (requestId === requestIdRef.current) setTasks(t);
              } catch (e) {
                console.error("Failed to filter tasks:", e);
                if (requestId === requestIdRef.current) setHasError(true);
              } finally {
                if (requestId === requestIdRef.current) setIsLoading(false);
              }
            }
          }}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Section title="Projects">
            {projects.map((project) => (
              <List.Dropdown.Item key={`project-${project.id}`} title={project.title} value={`project:${project.id}`} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Tags">
            {tags.map((tag) => (
              <List.Dropdown.Item
                key={`tag-${tag.id}`}
                title={`#${tag.title}`}
                value={`tag:${tag.id}`}
                icon={tag.color ? { source: Icon.Tag, tintColor: tag.color } : Icon.Tag}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {tasks.map((task) => {
        const tagStr = getTagTitles(task.tagIds, tags);
        const projectTitle = getProjectTitle(task.projectId, projects);
        const timeEstimate = task.timeEstimate > 0 ? `${task.timeEstimate / 3600000}h` : "";

        return (
          <List.Item
            key={task.id}
            title={task.title}
            subtitle={projectTitle}
            keywords={[task.title, projectTitle, tagStr]}
            accessories={[
              ...(tagStr ? [{ text: tagStr, icon: Icon.Tag }] : []),
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
                  <Action
                    title="Archive"
                    icon={Icon.Tray}
                    onAction={() => handleArchiveTask(task)}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteTask(task)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchTasks}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && tasks.length === 0 && (
        <List.EmptyView
          icon={Icon.List}
          title="No tasks found"
          description="All tasks are complete. Use 'Create Task' to add a new one."
        />
      )}
    </List>
  );
}
