import { ActionPanel, Action, confirmAlert, Alert } from "@raycast/api";
import { ReactNode } from "react";
import { Project, ProjectWithStatus } from "../types";
import { SHORTCUTS, Icons } from "../constants";
import { openProjectWithToast } from "../lib/ide";
import { createProjectDeeplink } from "../utils/deeplink";
import ProjectForm from "./ProjectForm";

// ============================================
// ProjectActions Component
// ============================================

interface ProjectActionsProps {
  project: Project | ProjectWithStatus;
  groups: string[];
  onRefresh: () => void;
  onDelete: (project: Project) => Promise<boolean>;
  onToggleFavorite: (project: Project) => Promise<void>;
  sortActions?: ReactNode;
}

export default function ProjectActions({
  project,
  groups,
  onRefresh,
  onDelete,
  onToggleFavorite,
  sortActions,
}: ProjectActionsProps) {
  const handleOpen = async () => {
    await openProjectWithToast(project);
    onRefresh();
  };

  const handleDelete = async () => {
    const confirmed = await confirmAlert({
      title: "Delete Project",
      message: `Are you sure you want to delete "${project.alias}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await onDelete(project);
    }
  };

  const handleToggleFavorite = async () => {
    await onToggleFavorite(project);
  };

  const isFavorite = project.isFavorite ?? false;

  return (
    <ActionPanel>
      {/* Primary Action */}
      <ActionPanel.Section>
        <Action icon={Icons.ArrowSquareOut} title={`Open in ${project.app.name}`} onAction={handleOpen} />
        <Action
          icon={isFavorite ? Icons.Star : Icons.StarFilled}
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          shortcut={SHORTCUTS.TOGGLE_FAVORITE}
          onAction={handleToggleFavorite}
        />
      </ActionPanel.Section>

      {/* Project Management */}
      <ActionPanel.Section title="Project">
        <Action.Push
          icon={Icons.Pencil}
          title="Edit"
          shortcut={SHORTCUTS.EDIT_PROJECT}
          target={<ProjectForm project={project} groups={groups} onSave={onRefresh} />}
        />
        <Action.Push
          icon={Icons.Plus}
          title="Add New"
          shortcut={SHORTCUTS.ADD_PROJECT}
          target={<ProjectForm groups={groups} onSave={onRefresh} />}
        />
      </ActionPanel.Section>

      {/* File & Path */}
      <ActionPanel.Section title="Path">
        <Action.ShowInFinder path={project.paths[0]} shortcut={SHORTCUTS.SHOW_IN_FINDER} />
        <Action.CopyToClipboard title="Copy Path" content={project.paths.join("\n")} shortcut={SHORTCUTS.COPY_PATH} />
        <Action.CreateQuicklink
          title="Create Quicklink"
          shortcut={SHORTCUTS.CREATE_QUICKLINK}
          quicklink={{
            name: project.alias,
            link: createProjectDeeplink(project.id),
          }}
        />
      </ActionPanel.Section>

      {/* Sort (from parent) */}
      {sortActions && <ActionPanel.Section title="View">{sortActions}</ActionPanel.Section>}

      {/* Destructive */}
      <ActionPanel.Section>
        <Action
          icon={Icons.Trash}
          title="Delete"
          style={Action.Style.Destructive}
          shortcut={SHORTCUTS.DELETE_PROJECT}
          onAction={handleDelete}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
