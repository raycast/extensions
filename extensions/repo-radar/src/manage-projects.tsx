import { ActionPanel, Action, List, confirmAlert, Alert } from "@raycast/api";
import { useProjects } from "./hooks/useProjects";
import { ProjectForm } from "./components";
import { SHORTCUTS, Icons } from "./constants";
import { Project, ProjectWithStatus } from "./types";

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
            icon={{ fileIcon: project.app.path }}
            title={project.alias}
            subtitle={project.paths[0].split("/").pop()}
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
                    icon={project.isFavorite ? Icons.Star : Icons.StarFilled}
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

// ============================================
// Helper Functions
// ============================================

function getAccessories(project: ProjectWithStatus): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  // Favorite indicator (text only, minimal)
  if (project.isFavorite) {
    accessories.push({
      tag: { value: "★", color: "#FFD700" },
      tooltip: "Favorite",
    });
  }

  // Group tag
  if (project.group) {
    accessories.push({
      tag: project.group,
      tooltip: `Group: ${project.group}`,
    });
  }

  // Git status (if git repo) - text only for consistency
  if (project.gitStatus?.isGitRepo && project.gitStatus.branch) {
    const { branch, ahead, behind, hasChanges } = project.gitStatus;

    // Build branch display
    const parts: string[] = [branch];

    if (ahead && ahead > 0) {
      parts.push(`↑${ahead}`);
    }
    if (behind && behind > 0) {
      parts.push(`↓${behind}`);
    }
    if (hasChanges) {
      parts.push("●");
    }

    // Build tooltip
    const tooltipParts = [`Branch: ${branch}`];
    if (ahead && ahead > 0) {
      tooltipParts.push(`${ahead} ahead`);
    }
    if (behind && behind > 0) {
      tooltipParts.push(`${behind} behind`);
    }
    if (hasChanges) {
      tooltipParts.push("Uncommitted changes");
    }

    accessories.push({
      text: parts.join(" "),
      tooltip: tooltipParts.join(" | "),
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
