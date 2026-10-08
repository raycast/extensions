import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color, Alert, confirmAlert } from "@raycast/api";
import { getTasks, getProjects, getTags, restoreTask, deleteTask } from "./api";
import type { Task, Project, Tag } from "./types";
import { getProjectTitle, getTagTitles } from "./utils";

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  async function fetchArchived() {
    setIsLoading(true);
    setHasError(false);
    try {
      const [fetchedTasks, fetchedProjects, fetchedTags] = await Promise.all([
        getTasks({ source: "archived" }),
        getProjects(),
        getTags(),
      ]);
      setTasks(fetchedTasks);
      setProjects(fetchedProjects);
      setTags(fetchedTags);
    } catch (e) {
      console.error("Failed to fetch archived tasks:", e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchArchived();
  }, []);

  async function handleRestore(task: Task) {
    try {
      await restoreTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Task restored",
        message: task.title,
      });
      fetchArchived();
    } catch (e) {
      console.error("Failed to restore task:", e);
    }
  }

  async function handleDelete(task: Task) {
    if (
      await confirmAlert({
        title: "Delete Permanently",
        message: `Permanently delete "${task.title}"? This cannot be undone.`,
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await deleteTask(task.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Task deleted",
          message: task.title,
        });
        fetchArchived();
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
          title="Could not load archived tasks"
          description="Make sure Super Productivity is running and its Local REST API is enabled."
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search archived tasks...">
      {tasks.map((task) => {
        const tagStr = getTagTitles(task.tagIds, tags);
        const projectTitle = getProjectTitle(task.projectId, projects);

        return (
          <List.Item
            key={task.id}
            title={task.title}
            subtitle={projectTitle}
            keywords={[task.title, projectTitle, tagStr]}
            accessories={[
              ...(task.isDone ? [{ icon: Icon.CheckCircle, text: "Done" }] : []),
              ...(tagStr ? [{ text: tagStr, icon: Icon.Tag }] : []),
              ...(task.dueDay ? [{ text: task.dueDay.slice(0, 10), icon: Icon.Calendar }] : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Restore" icon={Icon.Redo} onAction={() => handleRestore(task)} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Permanently"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(task)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchArchived}
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
          icon={Icon.Tray}
          title="No archived tasks"
          description="Archived tasks will appear here. Archive tasks from View Tasks or Today's Tasks."
        />
      )}
    </List>
  );
}
