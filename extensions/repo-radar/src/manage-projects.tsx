import { ActionPanel, Action, List, confirmAlert, Alert } from "@raycast/api";
import { useProjects } from "./hooks/useProjects";
import { ProjectForm } from "./components";
import { SHORTCUTS, Icons } from "./constants";
import { Project } from "./types";
import { formatSubtitle, getAccessories, getProjectIconPath, getProjectKeywords } from "./utils/project";

// ============================================
// Manage Projects Command
// ============================================

export default function ManageProjects() {
  const { projects, groups, isLoading, refresh, deleteProject, toggleFavorite } = useProjects();

  const handleDelete = async (project: Project) => {
    const confirmed = await confirmAlert({
      title: "Delete Project",
      message: `Are you sure you want to delete "${project.alias}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteProject(project);
    }
  };

  const handleToggleFavorite = async (project: Project) => {
    await toggleFavorite(project);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icons.Document}
          title="No Projects"
          description="Add your first project to get started"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icons.Plus}
                title="Add Project"
                shortcut={SHORTCUTS.ADD_PROJECT}
                target={<ProjectForm groups={groups} onSave={refresh} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            icon={{ fileIcon: getProjectIconPath(project) }}
            title={project.alias}
            subtitle={formatSubtitle(project)}
            keywords={getProjectKeywords(project)}
            accessories={getAccessories(project)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icons.Pencil}
                    title="Edit Project"
                    target={<ProjectForm project={project} groups={groups} onSave={refresh} />}
                  />
                  <Action
                    icon={Icons.Star}
                    title={project.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    shortcut={SHORTCUTS.TOGGLE_FAVORITE}
                    onAction={() => handleToggleFavorite(project)}
                  />
                  <Action.Push
                    icon={Icons.Plus}
                    title="Add Project"
                    shortcut={SHORTCUTS.ADD_PROJECT}
                    target={<ProjectForm groups={groups} onSave={refresh} />}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.ShowInFinder path={project.paths[0]} shortcut={SHORTCUTS.SHOW_IN_FINDER} />
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={project.paths.join("\n")}
                    shortcut={SHORTCUTS.COPY_PATH}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    icon={Icons.Trash}
                    title="Delete Project"
                    style={Action.Style.Destructive}
                    shortcut={SHORTCUTS.DELETE_PROJECT}
                    onAction={() => handleDelete(project)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
