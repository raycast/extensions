import { List } from "@raycast/api";
import { ReactNode } from "react";
import { Project } from "../types";
import { formatSubtitle, getAccessories, getProjectIconPath, getProjectKeywords } from "../utils/project";
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
  const keywords = getProjectKeywords(project);
  const iconPath = getProjectIconPath(project);

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
