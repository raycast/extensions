import { ActionPanel, Action, List, showToast, Toast, Icon, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";

import { seedProjectsFromMonday } from "@monday/project-sync";
import type { Project } from "@models";
import { readItem, writeItem } from "@utils/storage-helper";
import EditProjectForm from "edit-project-form";

/**
 * Command component for listing all projects.
 * Displays projects in a list with actions to Edit or Delete each project.
 * Fetches project data from LocalStorage.
 */
export default function ListProjectsCommand() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Fetches projects from LocalStorage and updates the state.
   */
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const mergedProjects = await seedProjectsFromMonday();

      setProjects(mergedProjects);
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Failed to load projects",
        "Could not retrieve projects from local storage.",
      );
      console.error("Failed to load projects:", error);
      setProjects([]);
    }
    setIsLoading(false);
  }, []);

  // Force refresh bypassing cache when user presses Cmd+R in list action
  const refreshNoCache = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Refreshing projects…" });
    await seedProjectsFromMonday(true);
    await fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /**
   * Handles the deletion of a project.
   * Checks if the project has associated time entries before deletion.
   * Prompts the user for confirmation before deleting.
   * @param projectId The ID of the project to delete.
   * @param projectName The name of the project to delete (for display in messages).
   */
  async function handleDeleteProject(projectId: string, projectName: string) {
    // 1. Check for associated time entries
    try {
      const timeEntries = await readItem("timeEntries");
      const hasAssociatedEntries = timeEntries.some((entry) => entry.projectId === projectId);

      if (hasAssociatedEntries) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Deletion Prevented",
          message: `Project '${projectName}' has associated time entries and cannot be deleted.`,
        });
        return;
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Checking Time Entries",
        message: "Could not verify project usage.",
      });
      console.error("Error checking time entries:", error);
      return;
    }

    // 2. Confirm deletion
    if (
      await confirmAlert({
        title: "Delete Project?",
        message: `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
        icon: Icon.Trash,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        const updatedProjects = projects.filter((p) => p.id !== projectId);
        await writeItem("projects", updatedProjects);
        setProjects(updatedProjects); // Optimistically update UI
        await showToast({
          style: Toast.Style.Success,
          title: "Project Deleted",
          message: `"${projectName}" has been deleted.`,
        });
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to delete project" });
        console.error("Failed to delete project:", error);
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Projects Found"
          description="Add your first project using the 'Add New Project' command."
          icon={Icon.List}
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            title={`${project.name} ${project.mondayGroupId ? "(Organization)" : "(Private)"}`}
            icon={Icon.List}
            actions={
              <ActionPanel title={`Actions for ${project.name}`}>
                <Action.Push
                  title="Edit Project"
                  icon={Icon.Pencil}
                  target={<EditProjectForm project={project} onProjectEdited={fetchProjects} />}
                />
                <Action
                  title="Delete Project"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteProject(project.id, project.name)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
      <ActionPanel.Section>
        <Action
          title="Refresh from monday.com"
          onAction={refreshNoCache}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          icon={Icon.Repeat}
        />
      </ActionPanel.Section>
    </List>
  );
}
