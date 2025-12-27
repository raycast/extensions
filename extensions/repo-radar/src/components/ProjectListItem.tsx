import { List } from "@raycast/api";
import { ReactNode } from "react";
import { Project, ProjectWithStatus } from "../types";
import ProjectActions from "./ProjectActions";

// ============================================
// ProjectListItem Component
// ============================================

interface ProjectListItemProps {
  project: ProjectWithStatus;
  groups: string[];
  onRefresh: () => void;
  onDelete: (project: Project) => Promise<boolean>;
  onToggleFavorite: (project: Project) => Promise<void>;
  sortActions?: ReactNode;
}

export default function ProjectListItem({
  project,
  groups,
  onRefresh,
  onDelete,
  onToggleFavorite,
  sortActions,
}: ProjectListItemProps) {
  const subtitle = formatSubtitle(project);
  const keywords = [project.alias, project.app.name, project.group, ...project.paths].filter(Boolean) as string[];

  return (
    <List.Item
      key={project.id}
      icon={{ fileIcon: project.app.path }}
      title={project.alias}
      subtitle={subtitle}
      keywords={keywords}
      accessories={getAccessories(project)}
      actions={
        <ProjectActions
          project={project}
          groups={groups}
          onRefresh={onRefresh}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
          sortActions={sortActions}
        />
      }
    />
  );
}

// ============================================
// Helper Functions
// ============================================

function formatSubtitle(project: ProjectWithStatus): string {
  const pathName = project.paths[0].split("/").pop() || project.paths[0];
  return pathName;
}

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
