import { List } from "@raycast/api";
import { ReactNode } from "react";
import { Project } from "../types";
import { getIconForGroup } from "../constants";
import ProjectActions from "./ProjectActions";

// ============================================
// ProjectListItem Component
// ============================================

interface ProjectListItemProps {
  project: Project;
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

  // Use terminal icon when openMode is "terminal", otherwise use IDE icon
  const iconPath = project.openMode === "terminal" && project.terminal?.path ? project.terminal.path : project.app.path;

  return (
    <List.Item
      key={project.id}
      icon={{ fileIcon: iconPath }}
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
