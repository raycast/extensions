import { ActionPanel, Action, List, confirmAlert, Alert } from "@raycast/api";
import { useProjects } from "./hooks/useProjects";
import { ProjectForm } from "./components";
import { SHORTCUTS, Icons, getIconForGroup } from "./constants";
import { Project } from "./types";

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
        projects.map((project) => {
          const iconPath =
            project.openMode === "terminal" && project.terminal?.path ? project.terminal.path : project.app.path;
          return (
            <List.Item
              key={project.id}
              icon={{ fileIcon: iconPath }}
              title={project.alias}
              subtitle={formatSubtitle(project)}
              keywords={[project.alias, project.app.name, project.group, ...project.paths].filter(Boolean) as string[]}
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
                      icon={project.isFavorite ? Icons.StarFilled : Icons.Star}
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
          );
        })
      )}
    </List>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatSubtitle(project: Project): string {
  const path = project.paths[0];
  const home = process.env.HOME || "";

  // Convert to relative path from home
  const relativePath = path.startsWith(home) ? "~" + path.slice(home.length) : path;

  // Remove the last component if it matches the alias (avoid repetition)
  const parts = relativePath.split("/");
  const lastPart = parts[parts.length - 1];

  if (lastPart.toLowerCase() === project.alias.toLowerCase()) {
    // Show parent path instead
    return parts.slice(0, -1).join("/");
  }

  return relativePath;
}

function getAccessories(project: Project): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  // Favorite indicator (text only, minimal)
  if (project.isFavorite) {
    accessories.push({
      tag: { value: "★", color: "#FFD700" },
      tooltip: "Favorite",
    });
  }

  // Group tag with icon
  if (project.group) {
    accessories.push({
      tag: { value: project.group },
      icon: getIconForGroup(project.group, project.groupIcon),
      tooltip: `Group: ${project.group}`,
    });
  }

  // Path count (if multiple)
  if (project.paths.length > 1) {
    accessories.push({
      text: `${project.paths.length} paths`,
      tooltip: `${project.paths.length} paths`,
    });
  }

  return accessories;
}
